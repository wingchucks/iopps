import test from "node:test";
import assert from "node:assert/strict";

import { mergePublicJobRecords, withAuthoritativeJobCounts } from "../src/lib/public-job-merge.ts";

test("authoritative public job merge counts imported jobs and active posts once", () => {
  const imported = [
    { id: "a", slug: "role-a", active: true },
    { id: "hidden", slug: "hidden", active: false },
  ];
  const posts = [
    { id: "a", slug: "role-a", status: "active" },
    { id: "b", slug: "role-b", status: "active" },
    { id: "draft", slug: "draft", status: "draft" },
  ];

  assert.deepEqual(
    mergePublicJobRecords(imported, posts).map((job) => job.id),
    ["a", "b"],
  );
});

test("post duplicates are removed when their slug matches an imported document ID", () => {
  const imported = [{ id: "source-id", slug: "current-role", active: true }];
  const posts = [{ id: "legacy-copy", slug: "source-id", status: "active" }];
  assert.equal(mergePublicJobRecords(imported, posts).length, 1);
});

test("post duplicates are removed when normalized slugs match despite different IDs", () => {
  const imported = [{ id: "source-id", slug: "Current Role", active: true }];
  const posts = [{ id: "legacy-copy", slug: "current-role", status: "active" }];
  assert.equal(mergePublicJobRecords(imported, posts).length, 1);
});

test("organization job counts come from merged public jobs instead of stale profile fields", () => {
  const organizations = [
    { id: "siga", name: "Saskatchewan Indian Gaming Authority", openJobs: 17 },
    { id: "westland", name: "Westland Insurance", openJobs: 99 },
  ];
  const jobs = [
    { id: "1", employerId: "siga", employerName: "SIGA" },
    { id: "2", orgName: "Saskatchewan Indian Gaming Authority" },
    { id: "3", employerName: "Westland Insurance" },
  ];

  assert.deepEqual(
    withAuthoritativeJobCounts(organizations, jobs).map((org) => org.openJobs),
    [2, 1],
  );
});
