import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHermesJobApproval,
  JOB_APPROVAL_CONFIRMATION,
  normalizeHermesJobReviewCommand,
  reviewHermesJobApproval,
  type HermesJobApprovalDocument,
  type HermesJobApprovalServiceDeps,
} from "../src/lib/server/hermes-job-approval.ts";

const reviewSecret = "s".repeat(64);

function jobDoc(
  collection: "jobs" | "posts",
  version = "v1",
  data: Record<string, unknown> = {},
): HermesJobApprovalDocument {
  return {
    id: "job-123",
    collection,
    schema: collection === "jobs" ? "employer-job-v1" : "legacy-job-post-v1",
    version,
    data: {
      title: "Community Liaison",
      orgName: "Northern Organization",
      status: "draft",
      active: false,
      privateContact: "must-not-leak@example.com",
      ...data,
    },
  };
}

function serviceDeps(
  overrides: Partial<HermesJobApprovalServiceDeps> = {},
): HermesJobApprovalServiceDeps {
  return {
    reviewSecret,
    findJobCandidates: async () => [jobDoc("jobs")],
    resolveFeaturedEntitlement: async () => ({
      ok: true,
      state: {
        employerId: "employer-1",
        employerVersion: "e1",
        plan: "premium",
        subscriptionTier: "premium",
        featuredPostCredits: 0,
        existingFeaturedCreditConsumed: false,
        activeFeaturedJobs: [],
        decision: "included_slot",
        consumeCredit: false,
      },
    }),
    commit: async () => ({
      status: "applied",
      committedAt: "2026-08-25T12:00:00.000Z",
      verified: {
        title: "Community Liaison", organization: "Northern Organization", status: "active",
        featuredIntent: "standard", entitlementDecision: "not_required",
      },
    }),
    ...overrides,
  };
}

test("job review accepts only an exact jobId object", () => {
  assert.deepEqual(normalizeHermesJobReviewCommand({ jobId: " job-123 " }), {
    ok: true,
    command: { jobId: "job-123" },
  });
  for (const input of [
    {},
    { jobId: "job-123", extra: true },
    { jobId: "" },
    { jobId: "a/b" },
    "job-123",
  ]) {
    assert.equal(normalizeHermesJobReviewCommand(input).ok, false);
  }
});

test("job apply requires only the opaque token and exact confirmation and rejects stale review state", async () => {
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;

  for (const invalid of [
    { reviewToken: reviewed.reviewToken, confirmation: "approve" },
    { reviewToken: reviewed.reviewToken, confirmation: JOB_APPROVAL_CONFIRMATION, jobId: "job-123" },
    { confirmation: JOB_APPROVAL_CONFIRMATION },
  ]) {
    assert.deepEqual(await applyHermesJobApproval(invalid, serviceDeps()), {
      ok: false,
      status: 400,
      error: "Apply requires the review token and exact confirmation",
    });
  }

  let commits = 0;
  const stale = await applyHermesJobApproval({
    reviewToken: reviewed.reviewToken,
    confirmation: JOB_APPROVAL_CONFIRMATION,
  }, serviceDeps({
    findJobCandidates: async () => [jobDoc("jobs", "changed")],
    commit: async () => {
      commits += 1;
      throw new Error("must not commit");
    },
  }));
  assert.deepEqual(stale, { ok: false, status: 409, error: "Review token is invalid or stale" });
  assert.equal(commits, 0);
});

test("job review resolves one draft and returns only safe projections plus an opaque bound token", async () => {
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.deepEqual(Object.keys(reviewed).sort(), ["current", "desired", "ok", "reviewToken"]);
  assert.deepEqual(reviewed.current, {
    title: "Community Liaison",
    organization: "Northern Organization",
    status: "draft",
    featuredIntent: "standard",
    entitlementDecision: "not_required",
  });
  assert.deepEqual(reviewed.desired, { ...reviewed.current, status: "active" });
  assert.match(reviewed.reviewToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(reviewed).includes("privateContact"), false);
  assert.equal(JSON.stringify(reviewed).includes("must-not-leak@example.com"), false);
});

test("job review rejects missing, ambiguous, ineligible, and mismatched canonical targets", async () => {
  assert.deepEqual(
    await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({ findJobCandidates: async () => [] })),
    { ok: false, status: 404, error: "Job target was not found" },
  );
  assert.deepEqual(
    await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({
      findJobCandidates: async () => [jobDoc("jobs"), jobDoc("posts")],
    })),
    { ok: false, status: 409, error: "Job target was ambiguous" },
  );
  assert.deepEqual(
    await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({
      findJobCandidates: async () => [jobDoc("jobs", "v1", { status: "closed" })],
    })),
    { ok: false, status: 409, error: "Job target is not eligible for approval" },
  );
  assert.deepEqual(
    await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({
      findJobCandidates: async () => [jobDoc("jobs", "v1", { status: "active", active: true, postedAt: null })],
    })),
    { ok: false, status: 409, error: "Active job is missing its publication timestamp" },
  );
  assert.deepEqual(
    await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({
      findJobCandidates: async () => [{ ...jobDoc("jobs"), id: "different-job" }],
    })),
    { ok: false, status: 409, error: "Job target identity did not match the exact request" },
  );
});

test("featured review states intent and its bound entitlement decision without private details", async () => {
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, serviceDeps({
    findJobCandidates: async () => [jobDoc("jobs", "v1", { featured: true, employerId: "employer-1" })],
  }));
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.current.featuredIntent, "featured");
  assert.equal(reviewed.current.entitlementDecision, "included_slot");
  assert.equal(reviewed.desired.featuredIntent, "featured");
  assert.equal(reviewed.desired.entitlementDecision, "included_slot");
  assert.equal(JSON.stringify(reviewed).includes("employer-1"), false);
  assert.equal(JSON.stringify(reviewed).includes("premium"), false);
});
