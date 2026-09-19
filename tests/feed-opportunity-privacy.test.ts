/* eslint-disable @typescript-eslint/no-explicit-any -- Partial route SDK fixtures; no live services. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { loadFeedOpportunityCanonical, publicFeedPosts } from "../src/lib/server/public-feed-posts.ts";
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

test("GET /api/posts scopes detail reads and canonical aliases while preserving feed privacy", async () => {
  const fixtures: Record<string, any[]> = {
    posts: [{ id: "event-hidden", type: "event", slug: "hidden", title: "PRIVATE CANARY", status: "active", order: 1 }, { id: "scholarship-visible", type: "scholarship", title: "OLD CANARY", status: "active", order: 2 }, { id: "story-id", slug: "story-slug", type: "story", title: "Public story", status: "active", order: 3 }],
    events: [{ id: "canonical-hidden", slug: "event-hidden", status: "draft", active: false }],
    scholarships: [{ id: "scholarship-visible", title: "Current public grant", status: "active", privateNotes: "INTERNAL CANARY" }],
  };
  for (const kind of ['events', 'scholarships']) fixtures[kind].push(...Array.from({ length: 500 }, (_, i) => ({ id: `unrelated-${i}`, slug: `unrelated-${i}`, title: 'UNRELATED CANARY', status: 'active' })));
  let detail = false;
  const canonicalReads: string[] = [], returned: string[] = [];
  const snapshot = (name: string, id: string) => {
    const row = fixtures[name].find(row => row.id === id);
    if (row) returned.push(row.id);
    return { id, exists: !!row, data: () => row };
  };
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ name, id, get: async () => snapshot(name, id) }),
      orderBy: () => ({ get: async () => { assert.equal(name, 'posts'); assert.equal(detail, false, 'detail requests must not scan posts'); return { docs: fixtures[name].map(row => snapshot(name, row.id)) }; } }),
      where: (field: string, operator: string, value: string | string[]) => ({ get: async () => {
        assert.equal(field, 'slug');
        if (name !== 'posts') { assert.equal(operator, 'in'); assert.ok(Array.isArray(value) && value.length <= 10); canonicalReads.push(name); }
        return { docs: fixtures[name].filter(row => operator === 'in' ? value.includes(row[field]) : row[field] === value).map(row => snapshot(name, row.id)) };
      } }),
      get: () => { throw Error('Unscoped canonical collection read'); },
    }),
    getAll: async (...refs: { name: string; id: string }[]) => {
      assert.ok(refs.length <= 200); canonicalReads.push(...refs.map(ref => ref.name));
      return refs.map(ref => snapshot(ref.name, ref.id));
    },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/app/api/posts/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, console, Buffer, require: (id: string) => {
      if (id === "next/server") return { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } };
      if (id === "@/lib/server/public-feed-posts") return { publicFeedPosts, loadFeedOpportunityCanonical };
      if (id === "@/lib/server/public-content-record") return { publicContentRecord };
      if (id === "@/lib/firebase-admin") return { getAdminDb: () => db };
      if (["@/lib/account-labels", "firebase-admin/firestore", "@/lib/api-auth", "@/lib/email"].includes(id)) return {};
      throw new Error(id);
    },
  });
  for (const suffix of ["", "?id=event-hidden", "?id=hidden", "?id=scholarship-visible", "?id=story-id", "?id=story-slug", "?id=missing"]) {
    detail = !!suffix; canonicalReads.length = 0; returned.length = 0;
    const response = await exports.GET({ nextUrl: new URL("http://localhost/api/posts" + suffix) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(!JSON.stringify(result).includes("CANARY"));
    const expected = !suffix ? ['scholarship-visible', 'story-id'] : suffix.includes('hidden') || suffix.includes('missing') ? [] : suffix.includes('story-') ? ['story-id'] : ['scholarship-visible'];
    assert.deepEqual(result.posts.map((post: any) => post.id), expected);
    assert.equal(returned.some(id => id.startsWith('unrelated-')), false);
    if (suffix.includes('story-') || suffix.includes('missing')) assert.deepEqual(canonicalReads, []);
  }
});
