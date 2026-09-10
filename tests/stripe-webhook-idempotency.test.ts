import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/app/api/stripe/webhook/route.ts", import.meta.url), "utf8");

test("Stripe fulfillment uses an atomic session receipt, not a deletable preclaim", () => {
  // Runtime rollback/retry/race invariants live in stripe-payment-emulator.test.ts.
  assert.match(source, /runTransaction/);
  assert.match(source, /collection\("subscriptions"\)\.doc\(session.id\)/);
  assert.match(source, /tx\.create\(purchaseRef/);
  assert.match(source, /tx\.create\(eventRef/);
  assert.doesNotMatch(source, /eventRef\.delete\(|collection\("subscriptions"\)\.add/);
});
