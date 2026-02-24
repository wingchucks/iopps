#!/usr/bin/env node
/**
 * Simulates a Stripe checkout.session.completed webhook event locally.
 * Usage: node scripts/test-webhook.js <orgId> <planId>
 * Example: node scripts/test-webhook.js osQ9E5wOVPVpCMcL09V7YSm0J0E2 tier2
 *
 * NOTE: This bypasses Stripe signature verification.
 * Only use for local testing — the real webhook endpoint requires a valid signature.
 * To test against local dev server, temporarily comment out signature verification.
 */

const orgId = process.argv[2];
const planId = process.argv[3] || "tier2";

if (!orgId) {
  console.error("Usage: node scripts/test-webhook.js <orgId> [planId]");
  console.error("Plans: tier1, tier2, tier3, standard-post, featured-post, program-post");
  process.exit(1);
}

const amounts = {
  tier1: 125000,
  tier2: 250000,
  tier3: 550000,
  "standard-post": 12500,
  "featured-post": 20000,
  "program-post": 5000,
};

const amount = amounts[planId] || 250000;
const gstAmount = Math.round(amount * 0.05);

const mockEvent = {
  id: `evt_test_${Date.now()}`,
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_test_${Date.now()}`,
      payment_intent: `pi_test_${Date.now()}`,
      amount_total: amount + gstAmount,
      metadata: {
        orgId,
        planId,
        amount: String(amount),
        gstAmount: String(gstAmount),
      },
    },
  },
};

console.log("Mock webhook event:");
console.log(JSON.stringify(mockEvent, null, 2));
console.log("\nTo test, POST this to your local dev server:");
console.log("  curl -X POST http://localhost:3000/api/stripe/webhook \\");
console.log("    -H 'Content-Type: application/json' \\");
console.log(`    -H 'stripe-signature: test' \\`);
console.log(`    -d '${JSON.stringify(mockEvent)}'`);
console.log("\n⚠️  Remember: signature verification must be disabled for local testing.");
