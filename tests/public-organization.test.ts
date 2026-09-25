import assert from "node:assert/strict";
import test from "node:test";
import { isPlausibleEmail, toPublicOrganization } from "../src/lib/public-organization.ts";
import { CANADIAN_PROVINCES, provinceCode } from "../src/lib/canadian-provinces.ts";
import { normalizeOrganizationProfilePatch } from "../src/lib/organization-profile.ts";

test("public directory records retain profile details and exclude account-only information", () => {
  const publicFields = { id: "sample", name: "Fictional business", businessIdentity: "indigenous", nation: "Example community", treatyTerritory: "Treaty 6", location: { city: "Saskatoon", province: "SK" }, services: ["Design"], partnerTier: "standard", promotionWeight: 10 };
  const result = toPublicOrganization({ ...publicFields, publicContactEmail: "public@example.invalid", contactEmail: "owner-sign-in@example.invalid", ownerId: "private-owner", stripeCustomerId: "private-customer", stripeSubscriptionId: "private-subscription", emailTemplates: { offer: "Private content" }, billingEmail: "billing@example.invalid", internalNotes: "Private note", futurePrivateField: "Must not appear", capabilities: ["post_jobs"], plan: "internal-plan" });
  assert.deepEqual(result, { ...publicFields, contactEmail: "public@example.invalid" });
});

test("the public contact email is opt-in: blank or invalid shows none, the account email never", () => {
  assert.equal("contactEmail" in toPublicOrganization({ name: "Fictional", contactEmail: "owner@example.invalid" }), false);
  assert.equal("contactEmail" in toPublicOrganization({ name: "Fictional", contactEmail: "owner@example.invalid", publicContactEmail: "" }), false);
  assert.equal("contactEmail" in toPublicOrganization({ name: "Fictional", publicContactEmail: "not an email" }), false);
  assert.equal(toPublicOrganization({ name: "Fictional", publicContactEmail: " team@example.invalid " }).contactEmail, "team@example.invalid");
  // Ordinary addresses with any letters, digits and dots are accepted.
  assert.equal(toPublicOrganization({ name: "Fictional", publicContactEmail: "admissions.services2@schools.example.ca" }).contactEmail, "admissions.services2@schools.example.ca");
  assert.equal("contactEmail" in toPublicOrganization({ name: "Fictional", publicContactEmail: "missing-at.example.ca" }), false);
});

test("public email check is linear and matches the previous rules", () => {
  for (const good of ["a@b.ca", "first.last+tag@sub.example.ca", "admissions@schools.example.ca"]) assert.equal(isPlausibleEmail(good), true, good);
  for (const bad of ["", "no-at.example.ca", "@example.ca", "a@b", "a@.ca", "a@b.", "a@@b.ca", "a b@c.ca", "a@b.ca ", `${"x".repeat(250)}@b.ca`]) assert.equal(isPlausibleEmail(bad), false, bad);
  const started = Date.now();
  assert.equal(isPlausibleEmail(`!@!.${"!.".repeat(200000)}`), false);
  assert.ok(Date.now() - started < 200, "adversarial input is rejected quickly");
});

test("all provinces and territories match full names and existing abbreviations", () => {
  assert.equal(CANADIAN_PROVINCES.length, 13);
  assert.equal(new Set(CANADIAN_PROVINCES.map(([code]) => code)).size, 13);
  for (const [code, name] of CANADIAN_PROVINCES) {
    assert.equal(provinceCode(` ${name.toLowerCase()} `), code);
    assert.equal(provinceCode(code.toLowerCase()), code);
  }
  assert.equal(provinceCode("Unknown region"), "");
  assert.equal(provinceCode(undefined), "");
});

test("profile identity rejects arrays and objects that stringify as allowed values", () => {
  assert.deepEqual(normalizeOrganizationProfilePatch({ businessIdentity: ["indigenous"] }).updates, {});
  assert.deepEqual(normalizeOrganizationProfilePatch({ businessIdentity: { toString: () => "indigenous" } }).updates, {});
});
