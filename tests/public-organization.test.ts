import assert from "node:assert/strict";
import test from "node:test";
import { toPublicOrganization } from "../src/lib/public-organization.ts";
import { CANADIAN_PROVINCES, provinceCode } from "../src/lib/canadian-provinces.ts";
import { normalizeOrganizationProfilePatch } from "../src/lib/organization-profile.ts";

test("public directory records retain profile details and exclude account-only information", () => {
  const publicFields = { id: "sample", name: "Fictional business", businessIdentity: "indigenous", nation: "Example community", treatyTerritory: "Treaty 6", location: { city: "Saskatoon", province: "SK" }, services: ["Design"], contactEmail: "public@example.invalid", partnerTier: "standard", promotionWeight: 10 };
  const result = toPublicOrganization({ ...publicFields, ownerId: "private-owner", stripeCustomerId: "private-customer", stripeSubscriptionId: "private-subscription", emailTemplates: { offer: "Private content" }, billingEmail: "billing@example.invalid", internalNotes: "Private note", futurePrivateField: "Must not appear", capabilities: ["post_jobs"], plan: "internal-plan" });
  assert.deepEqual(result, publicFields);
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
