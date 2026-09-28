import test from "node:test";
import assert from "node:assert/strict";
import { hasPublicOrganizationProfile, providerNameParts, resolveScholarshipProvider } from "../src/lib/server/scholarship-provider.ts";

const ready = { onboardingComplete: true, status: "approved", logoUrl: "https://cdn.example.test/logo.png", description: "Fictional profile.", website: "https://example.test" };
const curator = { id: "curator", slug: "curator-profile", ...ready, description: "A fictional assistant that shares awards from many providers." };
const namedCurator = { id: "named-curator", name: "Fictional Award Finder", slug: "award-finder", ...ready };
const hiddenProvider = { id: "afoa", name: "Fictional Finance Association", slug: "finance-association" };
const publicProvider = { id: "fund", name: "Fictional Fund", slug: "fictional-fund", ...ready };
const school = { id: "school", name: "Fictional Polytechnic", slug: "fictional-poly", type: "school", ...ready };
const organizations = [curator, namedCurator, hiddenProvider, publicProvider, school];

test("a curating account never stands in for the provider it shares", () => {
  const td = resolveScholarshipProvider({ orgId: "curator", orgName: "Fictional Bank / Fictional Finance Association" }, organizations);
  assert.equal(td.provider?.id, "afoa", "the named provider is found by a whole name");
  assert.equal(td.profile, null, "a provider without a public profile is not linked");
  assert.equal(td.listedBy, null, "an unnamed curating account is not shown");

  const unnamed = resolveScholarshipProvider({ orgId: "curator", orgName: "" }, organizations);
  assert.deepEqual(unnamed, { provider: null, profile: null, listedBy: null });

  const shared = resolveScholarshipProvider({ orgId: "named-curator", orgName: "Fictional Fund" }, organizations);
  assert.equal(shared.profile?.id, "fund");
  assert.equal(shared.listedBy?.id, "named-curator");
});

test("an organization posting its own award is still its provider", () => {
  const own = resolveScholarshipProvider({ orgId: "school", orgName: "Fictional Polytechnic" }, organizations);
  assert.equal(own.provider?.id, "school");
  assert.equal(own.profile?.id, "school");
  assert.equal(own.listedBy, null);
  const coProvided = resolveScholarshipProvider({ orgId: "fund", orgName: "Fictional Partner / Fictional Fund" }, organizations);
  assert.equal(coProvided.profile?.id, "fund");
  assert.equal(coProvided.listedBy, null);
});

test("provider names match whole organizations, not fragments", () => {
  assert.deepEqual(providerNameParts(" TD /  AFOA Canada "), ["td", "afoa canada"]);
  assert.deepEqual(providerNameParts(undefined), []);
  const fragment = resolveScholarshipProvider({ orgName: "Fictional Fundraising Circle" }, [{ id: "short", name: "Fictional Fund", slug: "short", ...ready }]);
  assert.equal(fragment.provider, null);
});

test("public profile gate follows the organization page", () => {
  assert.equal(hasPublicOrganizationProfile(publicProvider), true);
  assert.equal(hasPublicOrganizationProfile(hiddenProvider), false);
  assert.equal(hasPublicOrganizationProfile({ ...publicProvider, disabled: true }), false);
  assert.equal(hasPublicOrganizationProfile({ ...publicProvider, status: "suspended" }), false);
});
