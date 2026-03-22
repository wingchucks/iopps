import test from "node:test";
import assert from "node:assert/strict";

import {
  ONE_TIME_PLANS,
  SUBSCRIPTION_PLANS,
  getAnnualPlanAmount,
  getPlanById,
  isSubscriptionPlanId,
  normalizePaidTier,
} from "../src/lib/pricing.ts";

test("normalizePaidTier maps current, legacy, and checkout plan aliases", () => {
  assert.equal(normalizePaidTier("standard"), "standard");
  assert.equal(normalizePaidTier("essential"), "standard");
  assert.equal(normalizePaidTier("tier2"), "premium");
  assert.equal(normalizePaidTier("professional"), "premium");
  assert.equal(normalizePaidTier("school"), "school");
  assert.equal(normalizePaidTier("tier3"), "school");
  assert.equal(normalizePaidTier("featured-post"), null);
});

test("getAnnualPlanAmount uses normalized tier aliases", () => {
  assert.equal(getAnnualPlanAmount("standard"), 1250);
  assert.equal(getAnnualPlanAmount("essential"), 1250);
  assert.equal(getAnnualPlanAmount("premium"), 2500);
  assert.equal(getAnnualPlanAmount("professional"), 2500);
  assert.equal(getAnnualPlanAmount("school"), 5500);
});

test("subscription plan ids only match annual plan selections", () => {
  assert.equal(isSubscriptionPlanId("tier1"), true);
  assert.equal(isSubscriptionPlanId("tier2"), true);
  assert.equal(isSubscriptionPlanId("tier3"), true);
  assert.equal(isSubscriptionPlanId("featured-post"), false);
});

test("getPlanById resolves subscription and one-time plans", () => {
  assert.deepEqual(getPlanById("tier1"), SUBSCRIPTION_PLANS.tier1);
  assert.deepEqual(getPlanById("featured-post"), ONE_TIME_PLANS["featured-post"]);
  assert.equal(getPlanById("unknown-plan"), null);
});
