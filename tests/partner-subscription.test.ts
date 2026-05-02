import test from "node:test";
import assert from "node:assert/strict";

import {
  isAdminGrantSubscription,
  isComplimentarySubscription,
} from "../src/lib/server/partner-subscription.ts";

test("admin-granted zero-dollar subscriptions are identified correctly", () => {
  assert.equal(
    isAdminGrantSubscription({
      subscription: {
        tier: "TIER2",
        active: true,
        paymentId: "admin-grant-123",
        amountPaid: 0,
      },
    }),
    true
  );
});

test("paid subscriptions are not treated as admin grants", () => {
  assert.equal(
    isAdminGrantSubscription({
      subscription: {
        tier: "TIER2",
        active: true,
        paymentId: "pi_123",
        amountPaid: 2500,
      },
    }),
    false
  );
});

test("zero-dollar complimentary access is treated as complimentary even without admin-grant payment ids", () => {
  assert.equal(
    isComplimentarySubscription({
      subscription: {
        tier: "school",
        status: "active",
        paymentId: "complimentary-school-access",
        amountPaid: 0,
        bonusAccessReason: "Complimentary reactivation access",
      },
    }),
    true,
  );
});

test("known paid subscriptions are not treated as complimentary access", () => {
  assert.equal(
    isComplimentarySubscription({
      subscription: {
        tier: "premium",
        status: "active",
        paymentId: "pi_987",
        amountPaid: 2500,
        totalAmount: 2625,
      },
    }),
    false,
  );
});
