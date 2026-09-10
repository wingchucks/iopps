import test from "node:test";
import assert from "node:assert/strict";
import * as publicJobs from "../src/lib/public-jobs.ts";
import { readFileSync } from "node:fs";

test("homepage freshness is not reset by an automated source recheck", () => {
  const jobs = [
    { id: "old", employerId: "a", createdAt: "2026-06-01", updatedAt: "2026-09-09" },
    { id: "new", employerId: "b", createdAt: "2026-09-08", updatedAt: "2026-09-08" },
  ];
  assert.deepEqual(publicJobs.selectHomepageJobs(jobs, 2).map(j => j.id), ["new", "old"]);
});

test("homepage loader uses shared visibility and diverse selection", () => {
  const source = readFileSync("src/lib/server/landing-content.ts", "utf8");
  const block = source.slice(source.indexOf("export async function getLatestJobs"), source.indexOf("async function getUpcomingEvents"));
  assert.match(block, /mergePublicJobRecords/);
  assert.match(block, /selectHomepageJobs\(publicJobs/);
});

test("homepage ordering accepts Date objects as well as serialized dates", () => {
  const jobs = [
    { id: "old", employerId: "a", createdAt: new Date("2026-01-01") },
    { id: "new", employerId: "b", createdAt: new Date("2026-09-01") },
  ];
  assert.deepEqual(publicJobs.selectHomepageJobs(jobs, 2).map(j => j.id), ["new", "old"]);
});

test("homepage selection gives distinct employers their first slot before repeats", () => {
  const select = (publicJobs as Record<string, unknown>).selectHomepageJobs;
  assert.equal(typeof select, "function", "homepage needs an employer-diverse selector");
  const jobs = [
    { id: "a1", employerId: "a", createdAt: "2026-09-08" },
    { id: "a2", employerId: "a", createdAt: "2026-09-07" },
    { id: "a3", employerId: "a", createdAt: "2026-09-06" },
    { id: "b1", employerId: "b", createdAt: "2026-09-05" },
    { id: "c1", orgId: "c", createdAt: "2026-09-04" },
  ];
  const result = (select as (jobs: typeof jobs, count: number) => typeof jobs)(jobs, 4);
  assert.deepEqual(result.map(j => j.id), ["a1", "b1", "c1", "a2"]);
  assert.deepEqual(jobs.map(j => j.id), ["a1", "a2", "a3", "b1", "c1"]);
});
