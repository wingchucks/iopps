/* eslint-disable @typescript-eslint/no-explicit-any -- In-memory Firestore double; real SDK paths are covered by emulator tests. */
import test from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase-admin/firestore";
import { memoryFirestore } from "./helpers/memory-firestore.mjs";
import { buildPublicJobRouteIndex, findPublicJobDocument, type PublicJobRouteIndex } from "../src/lib/server/public-job-routing.ts";
import { loadPublicJobDocuments } from "../src/lib/server/public-job-documents.ts";
import { buildPublicJobRouteSlugMap, isPublicJobVisible, parsePublicJobRouteSlug, sortJobsByRecency } from "../src/lib/public-jobs.ts";
import { buildJobRouteSlug } from "../src/lib/server/job-slugs.ts";

/** The previous resolver: it read every active job and mirror for each lookup. */
async function fullScanRoute(db: Firestore, idOrSlug: string) {
  const { jobs, posts } = await loadPublicJobDocuments(db);
  const authoritativeIds = new Set(jobs.map(doc => doc.id));
  const candidates: any[] = [
    ...jobs.map(doc => ({ ...doc.data(), id: doc.id, source: "jobs" })),
    ...posts.filter(doc => !authoritativeIds.has(doc.id)).map(doc => ({ ...doc.data(), id: doc.id, source: "posts" })),
  ].filter(candidate => (candidate.source !== "jobs" || candidate.active === true) && isPublicJobVisible(candidate));
  const slugMap = buildPublicJobRouteSlugMap(candidates);
  const { exactId, baseSlug } = parsePublicJobRouteSlug(idOrSlug);
  const match = (candidate: any) => ({ id: candidate.id, source: candidate.source, routeSlug: slugMap.get(candidate.id) || buildJobRouteSlug(candidate) });
  if (exactId) {
    const exact = candidates.find(candidate => candidate.id === exactId);
    return exact && buildJobRouteSlug(exact) === baseSlug ? match(exact) : null;
  }
  const direct = candidates.find(candidate => candidate.id === idOrSlug);
  if (direct) return match(direct);
  const unique = candidates.find(candidate => slugMap.get(candidate.id) === idOrSlug);
  if (unique) return match(unique);
  const base = sortJobsByRecency(candidates.filter(candidate => buildJobRouteSlug(candidate) === baseSlug));
  return base.length ? match(base[0]) : null;
}

function generator(seed: number) {
  let state = seed;
  const random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
  const pick = <T,>(values: T[]): T => values[Math.floor(random() * values.length)];
  const ids = ["a", "b", "c", "nurse", "Nurse", "registered-nurse", "x", "é1", "𝒜z", "zz", "foo--", "a--b", "id9", "q1"];
  const date = () => pick<unknown>([undefined, new Date(Date.UTC(2026, 0, 1 + Math.floor(random() * 4))), "2026-01-03T00:00:00.000Z", "2026-01-02", 1767225600000]);
  const row = (kind: string): Record<string, unknown> => {
    const record: Record<string, unknown> = {};
    const slug = pick<unknown>([undefined, undefined, "", "  ", "nurse", " nurse ", "registered-nurse", "x--y", "foo--", "shared", 123]);
    if (slug !== undefined) record.slug = slug;
    const title = pick<unknown>([undefined, "", "Nurse", "Registered Nurse", "!!!", "A & B", "Shared", "foo"]);
    if (title !== undefined) record.title = title;
    if (kind === "jobs") record.active = pick<unknown>([true, true, true, false, undefined, "true"]);
    else { record.type = pick(["job", "job", "story"]); if (random() < 0.2) record.active = false; }
    record.status = pick<unknown>(["active", "active", undefined, "closed", "expired", "pending"]);
    if (random() < 0.3) record.closingDate = pick(["2020-01-01", "2099-01-01", "Open until filled"]);
    if (random() < 0.1) record.description = "Deadline is August 28, 2020";
    for (const field of ["createdAt", "updatedAt", "postedAt", "publishedAt"]) { const value = date(); if (value !== undefined) record[field] = value; }
    if (random() < 0.3) record.order = Math.floor(random() * 3);
    return record;
  };
  const dataset = () => {
    const data: Record<string, Record<string, Record<string, unknown>>> = { jobs: {}, posts: {} };
    for (let index = 0, count = 3 + Math.floor(random() * 9); index < count; index++) {
      const kind = random() < 0.65 ? "jobs" : "posts";
      const id = pick(ids);
      data[kind][id] = { ...row(kind), ...(random() < 0.1 ? { slug: `${pick(["nurse", "shared"])}--${id}` } : {}) };
    }
    return data;
  };
  return { random, row, dataset };
}

function inputs(data: Record<string, Record<string, Record<string, unknown>>>) {
  const values = new Set(["nurse", "shared", "foo", "foo--", "x--y", "nurse--a", "registered-nurse", "a/b", "__x__", "missing", "a-and-b"]);
  for (const rows of Object.values(data)) for (const [id, row] of Object.entries(rows)) {
    const base = buildJobRouteSlug({ id, slug: row.slug as string, title: row.title as string });
    for (const value of [id, base, `${base}--${id}`, `${base}--`, `${base}--zz`]) values.add(value);
  }
  return [...values];
}

test("targeted routing returns exactly what the full-scan resolver returned", async () => {
  for (let seed = 1; seed <= 120; seed++) {
    const { dataset } = generator(seed);
    const data = dataset();
    const db = memoryFirestore(data) as unknown as Firestore;
    for (const input of inputs(data)) {
      assert.deepEqual(await findPublicJobDocument(db, input), await fullScanRoute(db, input), `seed ${seed}: ${JSON.stringify(input)}`);
    }
  }
});

test("a cached route index stays exact for jobs published or edited after it was read", async () => {
  for (let seed = 1; seed <= 80; seed++) {
    const { dataset, random, row } = generator(seed * 7919);
    const data = dataset();
    const db = memoryFirestore(data) as any;
    const index = { ...(await buildPublicJobRouteIndex(db)), builtAt: Date.now() };
    // Writers stamp updatedAt; a fresh bounded query merges these changes.
    for (const [kind, rows] of Object.entries(data)) for (const id of Object.keys(rows)) {
      if (random() < 0.3) db.store.get(kind).set(id, { ...row(kind), updatedAt: new Date(index.builtAt + 1000) });
    }
    db.store.get("jobs").set(`fresh-${seed}`, { title: "Nurse", active: true, status: "active", updatedAt: new Date(index.builtAt + 2000) });
    for (const input of [...inputs(Object.fromEntries([...db.store].map(([name, rows]: [string, Map<string, any>]) => [name, Object.fromEntries(rows)]))), `fresh-${seed}`]) {
      assert.deepEqual(await findPublicJobDocument(db, input, async () => index), await fullScanRoute(db, input), `seed ${seed}: ${JSON.stringify(input)}`);
    }
  }
});

test("a lookup reads only the referenced documents and the jobs sharing that route", async () => {
  const jobs: Record<string, Record<string, unknown>> = {};
  for (let index = 0; index < 400; index++) jobs[`job-${index}`] = { title: `Role ${index}`, active: true, status: "active", description: "x".repeat(2000) };
  jobs.target = { title: "Registered Nurse", active: true, status: "active" };
  jobs.twin = { slug: "registered-nurse", active: true, status: "active", updatedAt: new Date("2026-01-02T00:00:00Z") };
  const db = memoryFirestore({ jobs, posts: {} }) as any;
  const index: PublicJobRouteIndex = { ...(await buildPublicJobRouteIndex(db)), builtAt: Date.now() };
  // The shared index reads only route fields of active candidates.
  for (const query of db.reads.queries) assert.deepEqual(query.fields, ["slug", "title"]);
  db.reads.queries.length = 0;
  db.reads.documents = 0;

  assert.deepEqual(await findPublicJobDocument(db, "registered-nurse", async () => index), { id: "twin", source: "jobs", routeSlug: "registered-nurse--twin" });
  assert.deepEqual(await findPublicJobDocument(db, "registered-nurse--target", async () => index), { id: "target", source: "jobs", routeSlug: "registered-nurse--target" });
  assert.deepEqual(await findPublicJobDocument(db, "job-7", async () => index), { id: "job-7", source: "jobs", routeSlug: "role-7" });
  assert.equal(await findPublicJobDocument(db, "registered-nurse--job-7", async () => index), null);
  for (const query of db.reads.queries) {
    // Only an indexed stored-slug lookup or the bounded recent-change query; never a full scan.
    const fields = query.filters.map(([field]: [string]) => field);
    assert.ok(fields.includes("slug") || (fields.includes("updatedAt") && query.limit <= 200), JSON.stringify(query));
  }
  assert.ok(db.reads.documents < 60, `read ${db.reads.documents} documents`);
});
