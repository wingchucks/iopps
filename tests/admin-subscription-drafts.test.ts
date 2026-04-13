import test from "node:test";
import assert from "node:assert/strict";

import {
  applyAdminSubscriptionTier,
  buildAdminSubscriptionDraft,
  recalculateAdminSubscriptionTotals,
} from "../src/lib/admin/subscription-drafts.ts";

test("business accounts default to premium when assigning a new manual subscription", () => {
  const draft = buildAdminSubscriptionDraft(
    { accountType: "business", plan: "free" },
    new Date("2026-04-13T00:00:00.000Z"),
  );

  assert.equal(draft.subscriptionTier, "premium");
  assert.equal(draft.subscriptionStart, "2026-04-13");
  assert.equal(draft.subscriptionEnd, "2027-04-13");
  assert.equal(draft.amount, "2500.00");
  assert.equal(draft.gstAmount, "125.00");
  assert.equal(draft.totalAmount, "2625.00");
});

test("school accounts default to the school tier", () => {
  const draft = buildAdminSubscriptionDraft(
    { accountType: "school", plan: "free" },
    new Date("2026-04-13T00:00:00.000Z"),
  );

  assert.equal(draft.subscriptionTier, "school");
  assert.equal(draft.amount, "5500.00");
  assert.equal(draft.gstAmount, "275.00");
  assert.equal(draft.totalAmount, "5775.00");
});

test("existing paid tiers are preserved in the draft", () => {
  const draft = buildAdminSubscriptionDraft(
    {
      accountType: "business",
      subscriptionTier: "standard",
      billingStartAt: "2026-01-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
    },
    new Date("2026-04-13T00:00:00.000Z"),
  );

  assert.equal(draft.subscriptionTier, "standard");
  assert.equal(draft.subscriptionStart, "2026-01-01");
  assert.equal(draft.subscriptionEnd, "2026-12-31");
});

test("changing the manual tier resets plan pricing to the selected annual tier", () => {
  const next = applyAdminSubscriptionTier(
    {
      subscriptionTier: "standard",
      subscriptionStart: "2026-04-13",
      subscriptionEnd: "2027-04-13",
      amount: "1250.00",
      gstAmount: "62.50",
      totalAmount: "1312.50",
      createSubscriptionRecord: true,
    },
    "premium",
  );

  assert.equal(next.subscriptionTier, "premium");
  assert.equal(next.amount, "2500.00");
  assert.equal(next.gstAmount, "125.00");
  assert.equal(next.totalAmount, "2625.00");
});

test("manual total recalculation supports complimentary access", () => {
  const totals = recalculateAdminSubscriptionTotals("0", "0");

  assert.deepEqual(totals, {
    amount: "0.00",
    gstAmount: "0.00",
    totalAmount: "0.00",
  });
});
