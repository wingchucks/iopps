import test from "node:test";
import assert from "node:assert/strict";

import {
  applyNormalizedSubscriptionState,
  buildSubscriptionState,
  normalizeSubscriptionStatus,
} from "../src/lib/server/subscription-state.ts";

test("nested subscription tier overrides stale legacy top-level tier fields", () => {
  const normalized = applyNormalizedSubscriptionState({
    plan: "premium",
    tier: "premium",
    subscriptionTier: "premium",
    subscription: {
      tier: "free",
      status: "none",
    },
  });

  assert.equal(normalized.plan, "free");
  assert.equal(normalized.tier, "free");
  assert.equal(normalized.subscriptionTier, undefined);
  assert.equal((normalized.subscription as Record<string, unknown>).status, "none");
});

test("buildSubscriptionState prefers nested status before legacy top-level status", () => {
  const subscription = buildSubscriptionState({
    subscriptionStatus: "active",
    subscription: {
      tier: "school",
      status: "trial",
    },
  });

  assert.equal(subscription.tier, "school");
  assert.equal(subscription.status, "trialing");
});

test("normalizeSubscriptionStatus maps historical values into canonical states", () => {
  assert.equal(normalizeSubscriptionStatus("trial"), "trialing");
  assert.equal(normalizeSubscriptionStatus("paid"), "active");
  assert.equal(normalizeSubscriptionStatus("cancelled"), "canceled");
});
