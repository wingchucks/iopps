import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/app/api/stripe/webhook/route.ts", import.meta.url), "utf8");

test("Stripe webhook claims each event before mutating billing state", () => {
  const claimIndex = source.indexOf('collection("stripeWebhookEvents").doc(event.id)');
  const purchaseIndex = source.indexOf('collection("subscriptions").add');
  assert.ok(claimIndex >= 0 && claimIndex < purchaseIndex);
  assert.match(source, /eventRef\.create\(/);
  assert.match(source, /already-exists/);
  assert.match(source, /eventRef\.delete\(\)/);
});
