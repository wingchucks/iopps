import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_CONVERSION_CONFIRMATION,
  applyHermesAccountConversion,
  buildHermesAccountConversionPlan,
  normalizeHermesAccountConversionCommand,
  reviewHermesAccountConversion,
  type HermesAccountConversionDocument,
  type HermesAccountConversionServiceDeps,
} from "../src/lib/server/hermes-account-conversion.ts";

const reviewSecret = "s".repeat(64);
const email = "owner@example.com";

function doc(id: string, version: string, data: Record<string, unknown>): HermesAccountConversionDocument {
  return { id, version, data };
}

function deps(overrides: Partial<HermesAccountConversionServiceDeps> = {}): HermesAccountConversionServiceDeps {
  const user = doc("user_1", "u1", {
    email,
    role: "employer",
    employerId: "employer_1",
    orgId: "organization_1",
    orgRole: "owner",
    displayName: "Preserve User",
  });
  const member = doc("user_1", "m1", {
    role: "employer",
    orgId: "organization_1",
    orgRole: "owner",
    resumeUrl: "preserve-resume",
  });
  const employer = doc("employer_1", "e1", {
    uid: "user_1",
    email,
    status: "approved",
    disabled: false,
    plan: "premium",
    subscriptionTier: "premium",
    subscriptionStatus: "active",
    applicationBranding: "preserve-employer",
  });
  const organization = doc("organization_1", "o1", {
    employerId: "employer_1",
    ownerId: "user_1",
    status: "approved",
    disabled: false,
    plan: "premium",
    tier: "premium",
    subscriptionTier: "premium",
    subscriptionStatus: "active",
    profileStory: "preserve-organization",
  });
  const subscriptions = [
    doc("subscription_1", "s1", {
      employerId: "employer_1",
      organizationId: "organization_1",
      plan: "tier2",
      status: "active",
      amount: 0,
      manualOverride: true,
      applicationId: "preserve-subscription",
    }),
    doc("subscription_2", "s2", {
      orgId: "organization_1",
      plan: "tier2",
      status: "active",
      totalAmount: 0,
      bonusAccessReason: "Complimentary Hermes administrator grant",
    }),
  ];
  return {
    reviewSecret,
    now: () => new Date("2026-08-20T12:00:00.000Z"),
    findUsersByEmail: async () => [structuredClone(user)],
    getMember: async () => structuredClone(member),
    findLinkedEmployers: async () => [structuredClone(employer)],
    findLinkedOrganizations: async () => [structuredClone(organization)],
    findLinkedSubscriptions: async () => structuredClone(subscriptions),
    commit: async () => ({
      status: "applied",
      committedAt: "2026-08-20T12:00:00.000Z",
      userId: "user_1",
      verified: {
        accountRole: "community",
        memberRole: "community",
        employerDisabled: true,
        organizationDisabled: true,
        subscriptionStatus: "expired",
        complimentarySubscriptionsExpired: 2,
      },
    }),
    cleanupAuthClaims: async () => {},
    markAuthCleanupComplete: async () => {},
    ...overrides,
  };
}

test("conversion review accepts exactly one normalized email field", () => {
  assert.deepEqual(normalizeHermesAccountConversionCommand({ email: " OWNER@EXAMPLE.COM " }), {
    ok: true,
    command: { email },
  });
  for (const input of [{ email, extra: true }, {}, { email: "bad" }, email]) {
    assert.equal(normalizeHermesAccountConversionCommand(input).ok, false);
  }
});

test("conversion review requires one user, its same-ID member, and unique linked targets", async () => {
  assert.deepEqual(
    await reviewHermesAccountConversion({ email }, deps({ findUsersByEmail: async () => [] })),
    { ok: false, status: 409, error: "Exact user lookup was not unique" },
  );
  assert.deepEqual(
    await reviewHermesAccountConversion({ email }, deps({ getMember: async () => null })),
    { ok: false, status: 409, error: "Same-ID member record was not found" },
  );
  assert.deepEqual(
    await reviewHermesAccountConversion({ email }, deps({
      findLinkedEmployers: async () => [doc("e1", "1", {}), doc("e2", "2", {})],
    })),
    { ok: false, status: 409, error: "Linked employer lookup was not unique" },
  );
  assert.deepEqual(
    await reviewHermesAccountConversion({ email }, deps({
      findLinkedOrganizations: async () => [doc("o1", "1", {}), doc("o2", "2", {})],
    })),
    { ok: false, status: 409, error: "Linked organization lookup was not unique" },
  );
});

test("conversion review binds every matching subscription and returns only sanitized projections", async () => {
  const reviewed = await reviewHermesAccountConversion({ email }, deps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.match(reviewed.reviewToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(Object.keys(reviewed).sort(), ["current", "desired", "ok", "reviewToken"]);
  const serialized = JSON.stringify({ current: reviewed.current, desired: reviewed.desired });
  for (const internal of ["user_1", "employer_1", "organization_1", "subscription_1", "subscription_2"]) {
    assert.equal(serialized.includes(internal), false);
  }
  assert.equal(reviewed.current.complimentarySubscriptionsActive, 2);
  assert.equal(reviewed.desired.complimentarySubscriptionsActive, 0);
});

test("conversion mutation plan changes only conversion fields", () => {
  const plan = buildHermesAccountConversionPlan(new Date("2026-08-20T12:00:00.000Z"));
  assert.deepEqual(plan.userPatch, {
    role: "community", employerId: null, orgId: null, orgRole: null,
  });
  assert.deepEqual(plan.memberPatch, { role: "community", orgId: null, orgRole: null });
  assert.equal(plan.employerPatch.disabled, true);
  assert.equal(plan.employerPatch.publicVisibility, "hidden");
  assert.equal(plan.employerPatch.plan, "free");
  assert.equal(plan.organizationPatch.directoryVisible, false);
  assert.equal(plan.organizationPatch.subscriptionStatus, "expired");
  assert.deepEqual(plan.subscriptionPatch, {
    status: "expired",
    expiredAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
  });
});

test("conversion apply rejects a stale token before commit", async () => {
  const reviewed = await reviewHermesAccountConversion({ email }, deps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  let commits = 0;
  const result = await applyHermesAccountConversion({
    reviewToken: reviewed.reviewToken,
    confirmation: ACCOUNT_CONVERSION_CONFIRMATION,
  }, deps({
    getMember: async () => doc("user_1", "changed", {}),
    commit: async () => {
      commits += 1;
      throw new Error("must not commit");
    },
  }));
  assert.deepEqual(result, { ok: false, status: 409, error: "Review token is invalid or stale" });
  assert.equal(commits, 0);
});

test("conversion apply commits then completes Auth cleanup", async () => {
  const service = deps();
  const reviewed = await reviewHermesAccountConversion({ email }, service);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const calls: string[] = [];
  const result = await applyHermesAccountConversion({
    reviewToken: reviewed.reviewToken,
    confirmation: ACCOUNT_CONVERSION_CONFIRMATION,
  }, {
    ...service,
    commit: async ({ plan, boundState }) => {
      calls.push("commit");
      assert.equal(boundState.subscriptions.length, 2);
      assert.deepEqual(plan.userPatch, { role: "community", employerId: null, orgId: null, orgRole: null });
      return {
        status: "applied",
        committedAt: "2026-08-20T12:00:00.000Z",
        userId: "user_1",
        verified: {
          accountRole: "community", memberRole: "community", employerDisabled: true,
          organizationDisabled: true, subscriptionStatus: "expired", complimentarySubscriptionsExpired: 2,
        },
      };
    },
    cleanupAuthClaims: async (uid) => { calls.push(`claims:${uid}`); },
    markAuthCleanupComplete: async () => { calls.push("cleanup-complete"); },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["commit", "claims:user_1", "cleanup-complete"]);
});
