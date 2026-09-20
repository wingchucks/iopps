import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("normal feed and public hydration writers use the transactional guard", () => {
  for (const path of ["../src/app/api/admin/feeds/[feedId]/sync/route.ts", "../src/app/api/cron/sync-feeds/route.ts", "../src/app/api/jobs/[id]/route.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /await updateImportedJobWithEditorialGuard\(/);
  }
  const client = readFileSync(new URL("../scripts/hermes-admin-client.mjs", import.meta.url), "utf8");
  assert.match(client, /"editorial-review": "\/api\/hermes\/v1\/jobs\/editorial\/review"/);
  assert.match(client, /"editorial-apply": "\/api\/hermes\/v1\/jobs\/editorial\/apply"/);
});
import { guardedEditorialImportPatch, updateImportedJobWithEditorialGuard } from "../src/lib/server/editorial-import-guard.ts";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";

test("target import guard reads inside the write transaction; other jobs keep their existing write path", async () => {
  const calls: string[] = [];
  let written: Record<string, unknown> = {};
  const ref = { id: REPAIR.jobId, parent: {id: "jobs"}, update: async (patch: Record<string, unknown>) => {calls.push("direct-write"); written = patch;} };
  const db = {runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    get: async () => {calls.push("transaction-read"); return {exists: true, data: () => current};},
    update: (_ref: unknown, patch: Record<string, unknown>) => {calls.push("transaction-write"); written = patch;},
  })};
  const incoming = {description: REPAIR.original, location: "Fictional"};
  await updateImportedJobWithEditorialGuard(db as unknown as Firestore, ref as unknown as DocumentReference, incoming, text => text);
  assert.deepEqual(calls, ["transaction-read", "transaction-write"]);
  assert.equal(written.description, REPAIR.replacement);
  ref.id = "fictional-other"; calls.length = 0;
  await updateImportedJobWithEditorialGuard(db as unknown as Firestore, ref as unknown as DocumentReference, incoming, text => text);
  assert.deepEqual(calls, ["direct-write"]); assert.equal(written.description, REPAIR.original);
});
import { REPAIR } from "../src/lib/server/hermes-editorial-repair.ts";
const current = { title: REPAIR.title, employerName: REPAIR.employer, externalUrl: REPAIR.urls[0], description: REPAIR.replacement,
  editorialCorrection: { repairId: REPAIR.id, kind: "user-approved-editorial", originalDescription: REPAIR.original, approvedDescription: REPAIR.replacement, sourceUrl: REPAIR.urls[0] } };
test("redirect aliases remain protected on repeated syncs", () => {
  const first = guardedEditorialImportPatch(REPAIR.jobId, current, {description: REPAIR.original, externalUrl: REPAIR.urls[1]});
  const next = { ...current, ...first };
  assert.equal(guardedEditorialImportPatch(REPAIR.jobId, next, {description: REPAIR.original}).description, REPAIR.replacement);
});
test("identical corrupt source cannot overwrite approved text; changed source is not suppressed", () => {
  assert.deepEqual(guardedEditorialImportPatch(REPAIR.jobId, current, {description: REPAIR.original, location: "Fictional"}), { description: REPAIR.replacement, location: "Fictional" });
  assert.deepEqual(guardedEditorialImportPatch(REPAIR.jobId, current, {description: "A genuinely new source description"}), {description: "A genuinely new source description", editorialCorrection: null});
  assert.deepEqual(guardedEditorialImportPatch("fictional-other", current, {description: REPAIR.original}), {description: REPAIR.original});
  assert.deepEqual(guardedEditorialImportPatch(REPAIR.jobId, {...current, description: "later edit"}, {description: REPAIR.original}), {description: REPAIR.original, editorialCorrection: null});
});
