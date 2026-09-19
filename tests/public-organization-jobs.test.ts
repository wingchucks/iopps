import test from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase-admin/firestore";
import { loadPublicOrganizationJobDocuments } from "../src/lib/server/public-organization-jobs.ts";
import { jobMatchesOrganization, mergePublicJobRecords } from "../src/lib/public-job-merge.ts";

const organization = { id: "org", employerId: "legacy-owner", name: "Fictional Company", shortName: "FC" };
type Row = { id: string; [key: string]: unknown };

function fixture() {
  const records: Record<string, Row[]> = {
    jobs: [
      { id: "current", orgId: "org", employerId: "legacy-owner", status: "active", title: "Current title" },
      { id: "legacy", employerId: "legacy-owner", status: "active" },
      { id: "by-name", employerName: "FICTIONAL COMPANY", status: "active" },
      { id: "closed", orgId: "former-owner", status: "closed" },
      { id: "moved", orgId: "different-org", status: "active" },
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
  const db = {
    collection: (collection: string) => ({
      get: () => { throw Error("Unscoped collection scan"); },
      where: (field: string, operator: string, values: string[]) => {
        assert.equal(operator, "in"); assert.ok(values.length <= 30);
        return { get: async () => ({ docs: records[collection].filter(row => values.includes(String(row[field]))).map(row => { returned.push(row.id); return snapshot(row); }) }) };
      },
      doc: (id: string) => ({ collection, id }),
    }),
    getAll: async (...refs: { collection: string; id: string }[]) => refs.map(ref => {
      lookups.push(ref.id); const row = records[ref.collection].find(row => row.id === ref.id);
      return row ? snapshot(row) : { id: ref.id, exists: false, data: () => undefined };
    }),
  };
  return { db: db as unknown as Firestore, lookups, returned };
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
