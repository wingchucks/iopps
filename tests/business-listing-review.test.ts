import test from "node:test";
import assert from "node:assert/strict";
import { businessListingIssues, reviewAfterProfileEdit } from "../src/lib/business-listing-review.ts";
import { isOrganizationPubliclyVisible } from "../src/lib/organization-profile.ts";
import { buildPartnersPayload } from "../src/lib/server/partners-payload.ts";
import { toPublicOrganization } from "../src/lib/public-organization.ts";

const complete = { name: "Fictional organization", status: "approved", emailVerified: true, onboardingComplete: true, verified: true, logoUrl: "https://example.invalid/logo.png", description: "Community event planning", contactEmail: "hello@example.invalid", location: { city: "Saskatoon", province: "SK" } };
test("new listing review overrides account approval, email confirmation and a paid plan", () => {
  for (const status of ["draft", "pending", "changes_requested", "rejected"]) {
    const org = { ...complete, directoryReview: { status, revision: 2, approvedRevision: 2 }, subscription: { tier: "premium", status: "active", amountPaid: 2500, paymentId: "pi_example", subscriptionEnd: "2099-12-31" } };
    assert.equal(isOrganizationPubliclyVisible(org), false);
    assert.equal(buildPartnersPayload([org]).partners.length, 0);
  }
  assert.equal(isOrganizationPubliclyVisible({ ...complete, directoryReview: { status: "approved", revision: 3, approvedRevision: 2 } }), false);
  assert.equal(isOrganizationPubliclyVisible({ ...complete, directoryReview: null }), false);
  assert.equal(isOrganizationPubliclyVisible({ ...complete, directoryReview: { status: "approved", revision: 3, approvedRevision: 3 } }), true);
});
test("existing profiles remain public until edited; a no-op save preserves approval", () => {
  assert.equal(isOrganizationPubliclyVisible(complete), true);
  assert.equal(reviewAfterProfileEdit(complete, { name: complete.name }), null);
  const review = { status: "approved", revision: 3, submittedRevision: 3, approvedRevision: 3 };
  const org = { ...complete, directoryReview: review, location: { city: "Saskatoon", province: "SK" } };
  assert.equal(reviewAfterProfileEdit(org, { location: { province: "SK", city: "Saskatoon" }, emailTemplates: { offer: "Private" } }), review);
  const changed = reviewAfterProfileEdit(org, { description: "Updated work" });
  assert.equal(changed?.status, "draft"); assert.equal(changed?.revision, 4);
  assert.equal(isOrganizationPubliclyVisible({ ...org, directoryReview: changed }), false);
  assert.equal(reviewAfterProfileEdit(complete, { name: "Updated organization" })?.status, "draft");
});
test("completeness does not require Indigenous identity; private feedback never enters public data", () => {
  assert.deepEqual(businessListingIssues(complete), []);
  assert.ok(businessListingIssues({ ...complete, location: { city: "Saskatoon", province: "Wrong" } }).length);
  assert.ok(businessListingIssues({ ...complete, website: "javascript:alert(1)" }).length);
  assert.equal("directoryReview" in toPublicOrganization({ ...complete, directoryReview: { feedback: "Private feedback" } }), false);
});
