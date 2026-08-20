import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExpiredSubscriptionAccessPatch,
  resolveSubscriptionExpirationTargets,
  subscriptionMatchesExpirationTargets,
} from "../src/lib/server/subscription-expiration.ts";

test("subscription expiration targets the bound employer and resolved organization when IDs differ", () => {
  assert.deepEqual(
    resolveSubscriptionExpirationTargets({
      employerId: "employer_1",
      orgId: "employer_1",
      organizationId: "organization_1",
    }),
    { employerId: "employer_1", organizationId: "organization_1" },
  );
});

test("another active legacy or three-field subscription prevents an expiration downgrade", () => {
  const targets = { employerId: "employer_1", organizationId: "organization_1" };

  assert.equal(subscriptionMatchesExpirationTargets({ orgId: "employer_1" }, targets), true);
  assert.equal(subscriptionMatchesExpirationTargets({
    employerId: "employer_1",
    orgId: "employer_1",
    organizationId: "organization_1",
  }, targets), true);
  assert.equal(subscriptionMatchesExpirationTargets({
    employerId: "other_employer",
    orgId: "other_employer",
    organizationId: "other_organization",
  }, targets), false);
});

test("subscription expiration preserves the legacy orgId fallback for the employer target", () => {
  assert.deepEqual(
    resolveSubscriptionExpirationTargets({ orgId: "legacy_org_1" }),
    { employerId: "legacy_org_1", organizationId: "legacy_org_1" },
  );
});

test("subscription expiration clears nested active Premium state", () => {
  const now = new Date("2026-08-20T00:00:00.000Z");
  assert.deepEqual(buildExpiredSubscriptionAccessPatch(now), {
    plan: "free",
    subscriptionTier: "free",
    subscriptionStatus: "expired",
    subscription: { tier: "free", status: "expired" },
    updatedAt: now,
  });
});
