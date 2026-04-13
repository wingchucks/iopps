import test from "node:test";
import assert from "node:assert/strict";

import { getPartnerEligibility, withPartnerPromotion } from "../src/lib/server/partner-promotion.ts";

function buildPublicBusinessRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-1",
    name: "Northern Lights Careers",
    type: "business",
    status: "approved",
    onboardingComplete: true,
    logoUrl: "https://cdn.example.com/logo.png",
    description: "Indigenous recruitment and advisory services.",
    contactEmail: "hello@example.com",
    publicVisibility: "public",
    subscription: {
      tier: "standard",
      status: "active",
      billingStartAt: "2026-01-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
      paymentId: "pi_123",
      amountPaid: 1250,
    },
    ...overrides,
  };
}

test("active paid standard subscriptions qualify for public partner status", () => {
  const eligibility = getPartnerEligibility(buildPublicBusinessRecord());

  assert.equal(eligibility.isEligible, true);
  assert.equal(eligibility.reason, "active_paid_subscription");
  assert.equal(eligibility.tier, "standard");
});

test("active paid premium subscriptions qualify for public partner status", () => {
  const eligibility = getPartnerEligibility(
    buildPublicBusinessRecord({
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_premium",
        amountPaid: 2500,
      },
    }),
  );

  assert.equal(eligibility.isEligible, true);
  assert.equal(eligibility.tier, "premium");
});

test("active paid school subscriptions qualify for public partner status", () => {
  const eligibility = getPartnerEligibility({
    id: "school-1",
    name: "Example Indigenous Institute",
    type: "school",
    status: "approved",
    publicVisibility: "public",
    subscription: {
      tier: "school",
      status: "active",
      billingStartAt: "2026-01-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
      paymentId: "pi_school",
      amountPaid: 5500,
    },
  });

  assert.equal(eligibility.isEligible, true);
  assert.equal(eligibility.tier, "school");
});

test("trialing school subscriptions do not qualify for partner visibility", () => {
  const eligibility = getPartnerEligibility({
    id: "school-2",
    name: "Trial School",
    type: "school",
    status: "approved",
    publicVisibility: "public",
    subscription: {
      tier: "school",
      status: "trialing",
      billingStartAt: "2026-03-01T00:00:00.000Z",
      subscriptionEnd: "2026-06-01T00:00:00.000Z",
    },
  });

  assert.equal(eligibility.isEligible, false);
  assert.equal(eligibility.reason, "trial_only");
});

test("admin-granted zero-dollar subscriptions do not qualify for partner visibility", () => {
  const eligibility = getPartnerEligibility(
    buildPublicBusinessRecord({
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "admin-grant-premium",
        amountPaid: 0,
      },
    }),
  );

  assert.equal(eligibility.isEligible, false);
  assert.equal(eligibility.reason, "admin_grant");
  assert.equal(withPartnerPromotion(buildPublicBusinessRecord({
    subscription: {
      tier: "premium",
      status: "active",
      billingStartAt: "2026-01-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
      paymentId: "admin-grant-premium",
      amountPaid: 0,
    },
  })).isPartner, false);
});

test("expired subscriptions do not qualify even if the status still says active", () => {
  const eligibility = getPartnerEligibility(
    buildPublicBusinessRecord({
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2025-01-01T00:00:00.000Z",
        subscriptionEnd: "2025-12-31T00:00:00.000Z",
        paymentId: "pi_expired",
        amountPaid: 2500,
      },
    }),
    new Date("2026-04-13T00:00:00.000Z"),
  );

  assert.equal(eligibility.isEligible, false);
  assert.equal(eligibility.reason, "expired");
});

test("hidden organizations do not qualify even with an active paid subscription", () => {
  const eligibility = getPartnerEligibility(
    buildPublicBusinessRecord({
      publicVisibility: "hidden",
    }),
  );

  assert.equal(eligibility.isEligible, false);
  assert.equal(eligibility.reason, "not_public");
});

test("legacy paid tier fields without real subscription evidence do not qualify", () => {
  const eligibility = getPartnerEligibility({
    id: "legacy-partner",
    name: "Legacy Partner Alias",
    type: "business",
    status: "approved",
    onboardingComplete: true,
    logoUrl: "https://cdn.example.com/legacy.png",
    description: "Old partner metadata without a real subscription record.",
    contactEmail: "legacy@example.com",
    publicVisibility: "public",
    plan: "premium",
    tier: "premium",
    subscriptionTier: "premium",
  });

  assert.equal(eligibility.isEligible, false);
  assert.equal(eligibility.reason, "no_paid_subscription");
});
