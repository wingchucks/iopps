import test from "node:test";
import assert from "node:assert/strict";

import { buildAdminSubscriptionOverrideArtifacts } from "../src/app/api/admin/employers/[orgId]/subscription/route.ts";

test("buildAdminSubscriptionOverrideArtifacts mirrors a complimentary premium grant to employer and org records", () => {
  const artifacts = buildAdminSubscriptionOverrideArtifacts(
    {
      subscriptionTier: "premium",
      subscriptionStart: "2026-04-13",
      subscriptionEnd: "2027-04-13",
      amount: 0,
      gstAmount: 0,
      totalAmount: 0,
    },
    {
      orgId: "org_1",
      employerName: "Prairie Sky",
      employerSlug: "prairie-sky",
      now: new Date("2026-04-13T00:00:00.000Z"),
      createdAtToken: "created-token",
      updatedAtToken: "updated-token",
    },
  );

  assert.ok(!("error" in artifacts));
  if ("error" in artifacts) {
    return;
  }

  assert.equal(artifacts.planId, "tier2");
  assert.equal(artifacts.tier, "premium");
  assert.equal(artifacts.subscriptionPayload.paymentId, "admin-grant-tier2");
  assert.equal(artifacts.employerUpdate.subscriptionStatus, "active");
  assert.equal(artifacts.organizationUpdate.employerId, "org_1");
  assert.equal(artifacts.organizationUpdate.name, "Prairie Sky");
  assert.equal(artifacts.organizationUpdate.slug, "prairie-sky");
  assert.equal(artifacts.subscriptionRecordPayload.createdAt, "created-token");
  assert.equal(artifacts.subscriptionRecordPayload.updatedAt, "updated-token");
});

test("buildAdminSubscriptionOverrideArtifacts supports school pricing and validation errors", () => {
  const schoolArtifacts = buildAdminSubscriptionOverrideArtifacts(
    {
      subscriptionTier: "school",
      subscriptionStart: "2026-04-13",
      subscriptionEnd: "2027-04-13",
    },
    {
      orgId: "school_1",
      now: new Date("2026-04-13T00:00:00.000Z"),
    },
  );

  assert.ok(!("error" in schoolArtifacts));
  if (!("error" in schoolArtifacts)) {
    assert.equal(schoolArtifacts.planId, "tier3");
    assert.equal(schoolArtifacts.amount, 5500);
  }

  const invalidArtifacts = buildAdminSubscriptionOverrideArtifacts(
    {
      subscriptionTier: "free",
      subscriptionStart: "2026-04-13",
      subscriptionEnd: "2027-04-13",
    },
    {
      orgId: "org_2",
      now: new Date("2026-04-13T00:00:00.000Z"),
    },
  );

  assert.deepEqual(invalidArtifacts, {
    error: "A paid plan tier is required.",
  });
});
