import test from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase-admin/firestore";
import { loadEmployerJobRows, mergeOwnedJobRows } from "../src/lib/server/employer-job-list.ts";

const owner = { employerId: "employer", orgId: "organization" };
const row = (id: string, data: Record<string, unknown> = {}) => ({ id, data: { orgId: "organization", type: "job", status: "draft", ...data } });

test("canonical jobs and supported post-only jobs remain listed once, including drafts", () => {
  const rows = mergeOwnedJobRows([row("mirror", { title: "Current" })], [row("mirror", { title: "Old" }), row("post-only"), row("event", { type: "event" })], owner);
  assert.deepEqual(rows.map(item => item.id), ["mirror", "post-only"]);
  assert.equal(rows[0].data.title, "Current");
});

test("deleted and foreign canonical jobs block older owned post mirrors", () => {
  const canonical = [row("deleted", { status: "deleted" }), row("timestamp", { deletedAt: "2026-09-18" }), row("foreign", { orgId: "other" })];
  assert.deepEqual(mergeOwnedJobRows(canonical, canonical.map(item => row(item.id)), owner), []);
  assert.deepEqual(mergeOwnedJobRows([], [row("foreign", { orgId: "other" }), row("deleted", { status: "deleted" })], owner), []);
});

test("list query covers all detail-route ownership scopes and reads shadow canonical IDs", async () => {
  const records = {
    jobs: [row("employer-field", { orgId: undefined, employerId: "employer" }), row("org-only", { orgId: "employer" }), row("moved", { orgId: "elsewhere" }), row("deleted", { status: "deleted" })],
    posts: [row("post-only"), row("moved"), row("deleted"), row("outsider", { orgId: "elsewhere" })],
  };
  const lookupIds: string[] = [];
  const db = {
    collection: (collection: keyof typeof records) => ({
      where: (field: string, _operator: string, value: string) => ({ get: async () => ({ docs: records[collection].filter(item => item.data[field] === value).map(item => ({ id: item.id, data: () => item.data })) }) }),
      doc: (id: string) => ({ collection, id }),
    }),
    getAll: async (...refs: { collection: keyof typeof records; id: string }[]) => refs.map(ref => {
      lookupIds.push(ref.id);
      const found = records[ref.collection].find(item => item.id === ref.id);
      return { id: ref.id, exists: Boolean(found), data: () => found?.data };
    }),
  };
  const result = await loadEmployerJobRows(db as unknown as Firestore, owner);
  assert.deepEqual(result.map(item => item.id).sort(), ["employer-field", "org-only", "post-only"]);
  assert.ok(lookupIds.includes("moved"));
  assert.ok(lookupIds.includes("post-only"));
});
