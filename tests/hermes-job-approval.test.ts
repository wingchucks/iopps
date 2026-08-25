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
        activeFeaturedJobsDigest: "a".repeat(64),
        activeFeaturedJobsCount: 0,
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
  assert.deepEqual(normalizeHermesJobReviewCommand({ jobId: "job-123", featured: false }), {
    ok: true,
    command: { jobId: "job-123", featured: false },
  });
  for (const input of [
    {},
    { jobId: "job-123", extra: true },
    { jobId: "job-123", featured: true },
    { jobId: "" },
    { jobId: "a/b" },
    "job-123",
  ]) {
    assert.equal(normalizeHermesJobReviewCommand(input).ok, false);
  }
});

test("featured draft can be reviewed for explicit standard publication without entitlement", async () => {
  let entitlementCalls = 0;
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123", featured: false }, serviceDeps({
    findJobCandidates: async () => [jobDoc("jobs", "v1", { featured: true })],
    resolveFeaturedEntitlement: async () => {
      entitlementCalls += 1;
      throw new Error("must not resolve entitlement");
    },
  }));
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(entitlementCalls, 0);
  assert.equal(reviewed.current.featuredIntent, "featured");
  assert.equal(reviewed.desired.featuredIntent, "standard");
  assert.equal(reviewed.desired.entitlementDecision, "not_required");
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
  assert.match(reviewed.reviewToken, /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/);
  assert.equal(JSON.stringify(reviewed).includes("privateContact"), false);
  assert.equal(JSON.stringify(reviewed).includes("must-not-leak@example.com"), false);
});

test("job review tokens keep sensitive bound state confidential and reject tampering", async () => {
  let commits = 0;
  const forbidden = [
    "employer-private-9281",
    "employer-version-private-7319",
    "plan-private-4827",
    "tier-private-5938",
    "938475610293847",
    "job-identity-private-6194",
    "job-version-private-2048",
  ];
  const deps = serviceDeps({
    findJobCandidates: async () => [jobDoc("jobs", "v1", {
      featured: true,
      employerId: "employer-private-9281",
    })],
    resolveFeaturedEntitlement: async () => ({
      ok: true,
      state: {
        employerId: "employer-private-9281",
        employerVersion: "employer-version-private-7319",
        plan: "plan-private-4827",
        subscriptionTier: "tier-private-5938",
        featuredPostCredits: 938475610293847,
        existingFeaturedCreditConsumed: false,
        activeFeaturedJobsDigest: "b".repeat(64),
        activeFeaturedJobsCount: 1,
        decision: "included_slot",
        consumeCredit: false,
      },
    }),
    commit: async () => {
      commits += 1;
      throw new Error("tampered review must not commit");
    },
  });
  const reviewed = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const secondReview = await reviewHermesJobApproval({ jobId: "job-123" }, deps);
  assert.equal(secondReview.ok, true);
  if (!secondReview.ok) return;
  assert.notEqual(secondReview.reviewToken, reviewed.reviewToken);
  assert.notEqual(secondReview.reviewToken.split(".")[1], reviewed.reviewToken.split(".")[1]);

  for (const segment of reviewed.reviewToken.split(".")) {
    const decoded = Buffer.from(segment, "base64url").toString("utf8");
    for (const value of [...forbidden, "job-123"]) assert.equal(decoded.includes(value), false, value);
  }

  const segments = reviewed.reviewToken.split(".");
  const mutate = (value: string) => `${value.slice(0, -1)}${value.endsWith("A") ? "B" : "A"}`;
  const tamperedTokens = [
    ["v2", ...segments.slice(1)].join("."),
    [segments[0], mutate(segments[1]), ...segments.slice(2)].join("."),
    [segments[0], segments[1], mutate(segments[2]), segments[3]].join("."),
    [...segments.slice(0, 3), mutate(segments[3])].join("."),
    `${reviewed.reviewToken}.${"A".repeat(10)}`,
    `v1.${"A".repeat(16)}.${"A".repeat(10_924)}.${"A".repeat(22)}`,
    "A".repeat(12_001),
  ];
  for (const reviewToken of tamperedTokens) {
    assert.deepEqual(await applyHermesJobApproval({
      reviewToken,
      confirmation: JOB_APPROVAL_CONFIRMATION,
    }, deps), { ok: false, status: 409, error: "Review token is invalid or stale" });
  }
  assert.equal(commits, 0);
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
