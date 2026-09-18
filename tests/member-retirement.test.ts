import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file: string, imports: Record<string, unknown> = {}, globals: Record<string, unknown> = {}) {
  // VM exports are callable modules from the actual candidate source.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Response, ...globals, require: (id: string) => {
    if (id in imports) return imports[id];
    throw new Error(`Retired surface loaded service ${id}`);
  }});
  return exports;
}

test("retired member API returns no records for anonymous, signed-in, own and admin requests", async () => {
  const route = load("src/app/api/members/route.ts", {
    "next/server": { NextResponse: Response },
    "firebase-admin/firestore": { FieldPath: { documentId: () => "id" } },
    "@/lib/api-auth": { verifyAuthToken: async () => ({ success: true, decodedToken: { uid: "self" } }) },
    "@/lib/server/member-privacy": { visibleMemberProfile: () => ({ uid: "peer", displayName: "Peer" }) },
    "@/lib/firebase-admin": { getAdminDb: () => { throw new Error("Retired endpoint accessed private records"); } },
  });
  for (const query of ["", "?uid=peer", "?uid=self", "?cursor=peer"]) {
    for (const authorization of ["", "Bearer fictional-member", "Bearer fictional-admin"]) {
      const request = new Request(`https://example.invalid/api/members${query}`, { headers: { authorization } });
      Object.assign(request, { nextUrl: new URL(request.url) });
      const response = await route.GET(request);
      assert.equal(response.status, 410);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { error: "Member browsing is no longer available", code: "ENDPOINT_RETIRED" });
    }
  }
});

const retiredPages = [
  "members", "members/[uid]", "members/[uid]/followers", "members/[uid]/following",
  "members/[uid]/endorsements", "mentorship", "mentorship/become", "mentorship/requests",
  "org/dashboard/talent",
];
for (const route of retiredPages) test(`legacy ${route} redirects without loading peer data`, () => {
  const destination = route.startsWith("org/") ? "/org/dashboard/applications" : "/profile";
  const page = load(`src/app/${route}/page.tsx`, {
    "next/navigation": { redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } },
    "react/jsx-runtime": { jsx: () => { throw new Error("Retired route rendered UI"); } },
  });
  assert.throws(() => page.default(), { message: `REDIRECT:${destination}` });
});

test("retired member metadata never resolves a member identity", async () => {
  const mod = load("src/lib/server/detail-metadata.ts", {
    "react": { cache: (fn: unknown) => fn }, "next/cache": { unstable_cache: (fn: unknown) => fn },
    "@/lib/firebase-admin": { getAdminDb: () => { throw new Error("Member metadata touched database"); } },
    "@/lib/server/public-opportunities": {}, "@/lib/server/public-detail-cache": {},
    "@/lib/server/member-privacy": {},
    "@/lib/server/seo": { buildListingMetadata: (data: unknown) => data },
  });
  const metadata = await mod.generateMemberMetadata("PRIVATE_UID");
  assert.equal(metadata.title, "Profile");
  assert.equal(JSON.stringify(metadata).includes("PRIVATE_UID"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(metadata.robots)), { index: false, follow: false });
});

test("navigation and active profile/applicant surfaces do not advertise member browsing", () => {
  const files = ["src/lib/navigation.ts", "src/components/OrgDashboardNav.tsx", "src/app/sitemap.ts",
    "src/app/profile/page.tsx", "src/app/profile/resume/page.tsx", "src/app/jobs/[slug]/apply/page.tsx",
    "src/app/org/dashboard/applications/page.tsx"];
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /(?:href[=:]|path:)\s*[^{\n]*(?:\/members|\/mentorship|\/org\/dashboard\/talent)|href=\{`\/members|["']\/mentorship["']/u, file);
  const nav = load("src/lib/navigation.ts");
  for (const item of nav.getMemberExploreNavItems()) assert.ok(!["/members", "/mentorship"].includes(item.href));
  assert.equal(load("src/lib/dashboard-navigation.ts").getStandaloneDashboardHref("Talent Search"), "/org/dashboard/applications");
  for (const route of ["members", "members/[uid]/endorsements", "mentorship"]) {
    const metadata = load(`src/app/${route}/layout.tsx`).metadata;
    assert.equal(metadata.title, "Profile");
    assert.deepEqual(JSON.parse(JSON.stringify(metadata.robots)), { index: false, follow: false });
  }
});

test("member client keeps own profile but never queries a directory or another account", async () => {
  let reads = 0;
  const mod = load("src/lib/firestore/members.ts", {
    "firebase/firestore": { doc: (...args: unknown[]) => args, getDoc: async () => { reads++; return { id: "self", exists: () => true, data: () => ({ displayName: "Own", resumeUrl: "PRIVATE_RESUME" }) }; } },
    "../firebase": { auth: { currentUser: { uid: "self" } }, db: {} },
  });
  assert.equal((await mod.getMemberProfile("self")).resumeUrl, "PRIVATE_RESUME");
  assert.equal(await mod.getMemberProfile("peer"), null);
  assert.deepEqual(JSON.parse(JSON.stringify(await mod.getAllMembers())), []);
  assert.deepEqual(JSON.parse(JSON.stringify(await mod.getMembersPaginated("cursor"))), { members: [], lastDoc: null });
  assert.equal(reads, 1);
});

test("messaging no longer contains a recipient directory or arbitrary relationship creation", () => {
  const source = readFileSync("src/app/messages/page.tsx", "utf8");
  assert.doesNotMatch(source, /getAllMembers|getMemberProfile|getOrCreateConversation|Search members|openNewChat/);
  assert.match(source, /getConversationPeer/);
  for (const preserved of ["onConversations", "onMessages", "sendMessage", "markConversationRead"]) assert.ok(source.includes(preserved));
});

test("conversation peer API returns generic identity without reading private profiles", async () => {
  let viewer: string | null = "self", reads: string[] = [];
  let participants = ["self", "peer"];
  const route = load("src/app/api/messages/peer/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/api-auth": { verifyAuthToken: async () => viewer ? { success: true, decodedToken: { uid: viewer } } : { success: false, response: Response.json({}, { status: 401 }) } },
    "@/lib/firebase-admin": { getAdminDb: () => ({ doc: (path: string) => ({ get: async () => {
      reads.push(path);
      if (path === "conversations/existing") return { exists: true, data: () => ({ participants }) };
      if (path === "members/peer") return { exists: true, data: () => ({ displayName: "Peer", photoURL: "avatar.png", email: "PRIVATE_EMAIL", bio: "PRIVATE_BIO", resumeUrl: "PRIVATE_RESUME" }) };
      return { exists: false, data: () => undefined };
    } }) }) },
  });
  async function call(query: string) {
    const req = new Request(`https://example.invalid/api/messages/peer${query}`);
    Object.assign(req, { nextUrl: new URL(req.url) }); return route.GET(req);
  }
  const response = await call("?conversationId=existing&uid=forged");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { peer: { uid: "peer", displayName: "IOPPS member" } });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(reads, ["conversations/existing"]);
  reads = []; viewer = "outsider";
  assert.equal((await call("?conversationId=existing")).status, 404);
  assert.deepEqual(reads, ["conversations/existing"]);
  reads = []; viewer = null;
  assert.equal((await call("?conversationId=existing")).status, 401);
  assert.deepEqual(reads, []);
  viewer = "self";
  assert.equal((await call("?conversationId=missing")).status, 404);
  for (const query of ["", "?conversationId=", "?conversationId=a%2Fb"]) assert.equal((await call(query)).status, 400);
  for (const malformed of [["self", "self"], ["self", "peer", "third"], ["self", "a/b"]]) {
    participants = malformed; reads = [];
    assert.equal((await call("?conversationId=existing")).status, 404);
    assert.deepEqual(reads, ["conversations/existing"]);
  }
});

test("chat client requests only the existing conversation projection", async () => {
  let requestUrl = "";
  const mod = load("src/lib/firestore/messages.ts", {
    "firebase/firestore": { collection: () => ({}) },
    "../firebase": { auth: { currentUser: { getIdToken: async () => "fictional-token" } }, db: {} },
  }, { fetch: async (url: string, options: RequestInit) => {
    requestUrl = url;
    assert.equal(options.cache, "no-store");
    return Response.json({ peer: { uid: "peer", displayName: "Peer" } });
  }});
  assert.equal(typeof mod.getConversationPeer, "function");
  assert.equal((await mod.getConversationPeer("existing id")).displayName, "Peer");
  assert.equal(requestUrl, "/api/messages/peer?conversationId=existing%20id");
});

test("own profile has no empty retired Connections card", () => {
  assert.doesNotMatch(readFileSync("src/app/profile/page.tsx", "utf8"), /CONNECTIONS/);
});

test("organization dashboard does not advertise the legacy talent tab", () => {
  assert.doesNotMatch(readFileSync("src/app/org/dashboard/page.tsx", "utf8"), /"Talent Search",/);
});
