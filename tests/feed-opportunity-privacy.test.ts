/* eslint-disable @typescript-eslint/no-explicit-any -- Partial route SDK fixtures; no live services. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { publicFeedPosts } from "../src/lib/server/public-feed-posts.ts";
import { publicContentRecord } from "../src/lib/server/public-content-record.ts";

test("active feed copies cannot revive private, closed, deleted or rejected canonical opportunities", () => {
  for (const type of ["event", "scholarship"]) {
    const kind = type === "event" ? "events" : "scholarships";
    const mirror = { id: `${type}-old-slug`, type, status: "active", slug: "old-slug", title: "PRIVATE CANARY", order: 1 };
    for (const status of ["draft", "private", "closed", "deleted", "rejected", "pending"]) {
      assert.deepEqual(publicFeedPosts([mirror], { [kind]: [{ id: "canonical-id", slug: "old-slug", title: "PRIVATE CANARY", startDate: "2099-06-12", status, active: true }] }), []);
    }
    assert.deepEqual(publicFeedPosts([mirror], { [kind]: [{ id: "old-slug", status: "active", active: false }] }), []);
  }
});

test("visible canonical content replaces stale mirror fields while preserving its post address", () => {
  for (const type of ["event", "scholarship"]) {
    const kind = type === "event" ? "events" : "scholarships";
    const posts = publicFeedPosts([{ id: `${type}-same`, type, title: "STALE CANARY", description: "OLD CANARY", status: "active", order: 7 }], {
      [kind]: [{ id: "same", slug: "current-route", title: "Current public title", description: "Current description", status: "active", startDate: "2099-06-12", privateNotes: "INTERNAL CANARY" }],
    });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, `${type}-same`);
    assert.equal(posts[0].slug, "current-route");
    assert.equal(posts[0].title, "Current public title");
    assert.equal(posts[0].type, type);
    assert.ok(!JSON.stringify(posts).includes("CANARY"));
  }
});

test("standalone public opportunities and community posts remain available", () => {
  const posts = publicFeedPosts([
    { id: "independent", type: "scholarship", title: "Public grant", status: "active" },
    { id: "event-independent", type: "event", title: "Public gathering", startDate: "2099-06-12", status: "active" },
    { id: "hidden", type: "scholarship", title: "Private", status: "active", active: false },
    { id: "story", type: "story", title: "Story", status: "active" },
  ], {});
  assert.deepEqual(posts.map(post => post.id), ["independent", "event-independent", "story"]);
});

test("GET /api/posts applies canonical privacy to both the feed and direct legacy ID lookup", async () => {
  const fixtures: Record<string, any[]> = {
    posts: [{ id: "event-hidden", type: "event", slug: "hidden", title: "PRIVATE CANARY", status: "active", order: 1 }, { id: "scholarship-visible", type: "scholarship", title: "OLD CANARY", status: "active", order: 2 }],
    events: [{ id: "canonical-hidden", slug: "hidden", status: "draft", active: false }],
    scholarships: [{ id: "visible", title: "Current public grant", status: "active", privateNotes: "INTERNAL CANARY" }],
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/app/api/posts/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, console, require: (id: string) => {
      if (id === "next/server") return { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } };
      if (id === "@/lib/server/public-feed-posts") return { publicFeedPosts };
      if (id === "@/lib/server/public-content-record") return { publicContentRecord };
      if (id === "@/lib/firebase-admin") return { getAdminDb: () => ({ collection: (name: string) => {
        const query = { orderBy: () => query, get: async () => ({ docs: fixtures[name].map(record => ({ id: record.id, data: () => record })) }) };
        return query;
      } }) };
      if (["@/lib/account-labels", "firebase-admin/firestore", "@/lib/api-auth", "@/lib/email"].includes(id)) return {};
      throw new Error(id);
    },
  });
  for (const suffix of ["", "?id=event-hidden", "?id=hidden", "?id=scholarship-visible"]) {
    const response = await exports.GET({ nextUrl: new URL("http://localhost/api/posts" + suffix) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(!JSON.stringify(result).includes("CANARY"));
    assert.deepEqual(result.posts.map((post: any) => post.id), suffix.includes("hidden") ? [] : ["scholarship-visible"]);
  }
});
