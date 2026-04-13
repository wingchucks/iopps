import test from "node:test";
import assert from "node:assert/strict";

import {
  applyJobDisplayFallbacks,
  inferJobEmploymentType,
  inferJobLocation,
  resolveExternalApplicationUrl,
} from "../src/lib/job-record-utils.ts";

test("resolveExternalApplicationUrl recognizes feed applyUrl values", () => {
  assert.equal(
    resolveExternalApplicationUrl({
      applyUrl: "https://jobs.dayforcehcm.com/en-US/westlandinsurance/CANDIDATEPORTAL/jobs/32311/apply",
      sourceUrl: "https://jobs.dayforcehcm.com/en-US/westlandinsurance/CANDIDATEPORTAL/jobs/32311",
    }),
    "https://jobs.dayforcehcm.com/en-US/westlandinsurance/CANDIDATEPORTAL/jobs/32311/apply",
  );
});

test("job display fallbacks infer Westland-style location and employment type from description text", () => {
  const job = applyJobDisplayFallbacks({
    title: "Insurance Advisor",
    description:
      "Location: Toronto, ON\nPosition Type: Full-time\nJoin Westland Insurance Group Ltd. in this role.",
    location: "",
    employmentType: "",
    jobType: "",
  });

  assert.equal(job.location, "Toronto, ON");
  assert.equal(job.employmentType, "Full-time");
  assert.equal(job.jobType, "Full-time");
});

test("location inference pulls the city and province instead of the whole sentence", () => {
  assert.equal(
    inferJobLocation({
      description:
        "Westland Insurance Group is growing and has an exciting opportunity for a Senior Insurance Advisor in Rimbey, AB.",
    }),
    "Rimbey, AB",
  );
});

test("location inference falls back to branch city names when the province is omitted", () => {
  assert.equal(
    inferJobLocation({
      description:
        "Westland Insurance Group Ltd is growing and has a new opportunity for an Insurance Administrator in our Calgary - Centre North branch.",
    }),
    "Calgary",
  );
});

test("location inference labels national hybrid jobs when no city is provided", () => {
  assert.equal(
    inferJobLocation({
      description:
        "This is a hybrid role that can be based anywhere nationally close to a Westland office.",
    }),
    "Canada-wide",
  );
});

test("job display fallbacks do not overwrite explicit location or application URL values", () => {
  const job = applyJobDisplayFallbacks({
    title: "Claims Advisor",
    description:
      "Location: Regina, SK\nPosition Type: Full-time\nApply through the employer careers site.",
    location: "Vancouver, BC",
    employmentType: "Contract",
    applicationUrl: "https://example.com/custom-apply",
    applyUrl: "https://example.com/feed-apply",
  });

  assert.equal(job.location, "Vancouver, BC");
  assert.equal(job.employmentType, "Contract");
  assert.equal(job.applicationUrl, "https://example.com/custom-apply");
});

test("direct inference helpers return empty strings when source text is missing", () => {
  assert.equal(inferJobLocation({ description: "" }), "");
  assert.equal(inferJobEmploymentType({ title: "", description: "" }), "");
});
