import test from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase-admin/firestore";
import { loadPublicOrganizationJobDocuments, loadPublicOrganizationsJobDocuments } from "../src/lib/server/public-organization-jobs.ts";
import { loadPublicJobDocuments } from "../src/lib/server/public-job-documents.ts";
import { jobMatchesOrganization, mergePublicJobRecords, withAuthoritativeJobCounts } from "../src/lib/public-job-merge.ts";

const organization = { id: "org", employerId: "legacy-owner", name: "Fictional Company", shortName: "FC" };
type Row = { id: string; [key: string]: unknown };

function fixture() {
  const records: Record<string, Row[]> = {
    jobs: [
      { id: "current", orgId: "org", employerId: "legacy-owner", active: true, status: "active", title: "Current title" },
      { id: "legacy", employerId: "legacy-owner", active: true, status: "active" },
      { id: "by-name", employerName: "FICTIONAL COMPANY", active: true, status: "active" },
      { id: "closed", orgId: "former-owner", active: false, status: "closed" },
      { id: "moved", orgId: "different-org", active: true, status: "active" },
      ...Array.from({ length: 500 }, (_, index) => ({ id: `foreign-${index}`, orgId: "different-org", status: "active" })),
    ],
    posts: [
      { id: "current", orgId: "org", type: "job", status: "active", title: "Stale title" },
      { id: "closed", orgId: "org", type: "job", status: "active" },
      { id: "moved", orgId: "org", type: "job", status: "active" },
      { id: "post-only", companyName: "FC", type: "job", status: "active" },
      { id: "draft", orgId: "org", type: "job", status: "draft" },
      { id: "event", orgId: "org", type: "event", status: "active" },
    ],
  };
  const lookups: string[] = [], returned: string[] = [];
  const snapshot = (row: Row) => ({ id: row.id, exists: true, data: () => row });
  const query = (collection: string, filters: Array<[string, string, unknown]> = []) => ({
      get: async () => {
        assert.ok(filters.length, "No unscoped collection scan");
        return { docs: records[collection].filter(row => filters.every(([field, operator, values]) => operator === "in" ? (values as string[]).includes(String(row[field])) : row[field] === values))
          .map(row => { returned.push(row.id); return snapshot(row); }) };
      },
      where: (field: string, operator: string, values: unknown) => {
        if (operator === "in") assert.ok(Array.isArray(values) && values.length <= 30);
        else assert.equal(operator, "==");
        return query(collection, [...filters, [field, operator, values]]);
      },
      doc: (id: string) => ({ collection, id }),
    });
  const db = {
    collection: (collection: string) => query(collection),
    getAll: async (...refs: { collection: string; id: string }[]) => refs.map(ref => {
      lookups.push(ref.id); const row = records[ref.collection].find(row => row.id === ref.id);
      return row ? snapshot(row) : { id: ref.id, exists: false, data: () => undefined };
    }),
  };
  return { db: db as unknown as Firestore, lookups, returned, records };
}

test("organization job reads stay scoped, include legacy aliases and retain canonical visibility", async () => {
  const f = fixture();
  const docs = await loadPublicOrganizationJobDocuments(f.db, organization);
  const jobs = mergePublicJobRecords(docs.jobs.map(doc => ({ ...doc.data(), id: doc.id })), docs.posts.map(doc => ({ ...doc.data(), id: doc.id })))
    .filter(job => jobMatchesOrganization(job, organization));
  assert.deepEqual(jobs.map(job => job.id).sort(), ["by-name", "current", "legacy", "post-only"]);
  assert.equal(jobs.find(job => job.id === "current")?.title, "Current title");
  assert.deepEqual(f.lookups.sort(), ["closed", "moved", "post-only"]);
  assert.equal(f.returned.some(id => id.startsWith("foreign-")), false);
  assert.equal(docs.jobs.filter(doc => doc.id === "current").length, 1);
});

test("an organization without usable identities performs no job reads", async () => {
  const result = await loadPublicOrganizationJobDocuments({} as Firestore, { name: " " });
  assert.deepEqual(result, { jobs: [], posts: [] });
});

test("large directory counts avoid query fanout and inactive history without double counting", async () => {
  const f = fixture();
  const organizations = [organization, ...Array.from({ length: 45 }, (_, index) => ({ id: `organization-${index}`, name: `Fictional Group ${index}` }))];
  f.records.jobs.push({ id: "last-group", employerId: "organization-44", active: true, status: "active" });
  const docs = await loadPublicOrganizationsJobDocuments(f.db, organizations);
  const publicJobs = mergePublicJobRecords(docs.jobs.map(doc => ({ ...doc.data(), id: doc.id })), docs.posts.map(doc => ({ ...doc.data(), id: doc.id })));
  const counts = withAuthoritativeJobCounts(organizations, publicJobs);
  assert.equal(counts[0].openJobs, 4);
  assert.equal(counts.at(-1)?.openJobs, 1);
  assert.equal(counts[1].openJobs, 0);
  assert.equal(f.returned.some(id => id.startsWith("foreign-")), false);
  assert.equal(docs.jobs.filter(doc => doc.id === "current").length, 1);
});

test("public job lists read active candidates and only necessary historical shadows, with fresh visibility", async () => {
  const f = fixture();
  f.records.jobs.forEach(row => { row.active = ["current", "legacy", "by-name", "moved"].includes(row.id); });
  const read = async () => {
    const docs = await loadPublicJobDocuments(f.db);
    return mergePublicJobRecords(docs.jobs.map(doc => ({ ...doc.data(), id: doc.id, active: doc.data()!.active === true })), docs.posts.map(doc => ({ ...doc.data(), id: doc.id })));
  };
  assert.deepEqual((await read()).map(job => job.id).sort(), ["by-name", "current", "legacy", "moved", "post-only"]);
  assert.deepEqual(f.lookups.sort(), ["closed", "post-only"]);
  assert.equal(f.returned.some(id => id.startsWith("foreign-")), false);
  const current = f.records.jobs.find(row => row.id === "current")!;
  current.active = false;
  current.status = "closed";
  f.records.jobs.push({ id: "new", orgId: "org", active: true });
  assert.deepEqual((await read()).map(job => job.id).sort(), ["by-name", "legacy", "moved", "new", "post-only"]);
  assert.ok(f.lookups.includes("current"), "A newly closed canonical record still suppresses its active post");
});
