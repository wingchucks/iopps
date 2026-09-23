import test from "node:test";
import assert from "node:assert/strict";

import {
  COMMUNITY_IDENTITY_TAG_SUGGESTIONS,
  INDUSTRY_TAG_SUGGESTIONS,
} from "../src/lib/profile-tag-suggestions.ts";
import {
  canonicalOrgSlug,
  orgSlugRedirectEntries,
  ORG_SLUG_ALIASES,
} from "../src/lib/org-slug-aliases.ts";
import {
  JOB_AREAS,
  EMPLOYMENT_TYPE_OPTIONS,
  classifyJobArea,
} from "../src/lib/job-taxonomy.ts";
import { toPublicOrganization } from "../src/lib/public-organization.ts";

/* Bug 9 — tag taxonomy separation: community identity vs industry tags. */
test("bug 9: community-identity and industry tag suggestions are disjoint and correctly labeled", () => {
  const community = new Set<string>(COMMUNITY_IDENTITY_TAG_SUGGESTIONS);
  const industry = new Set<string>(INDUSTRY_TAG_SUGGESTIONS);
  assert.ok(community.size > 0, "community group must not be empty");
  assert.ok(industry.size > 0, "industry group must not be empty");
  for (const tag of community) {
    assert.ok(!industry.has(tag), `tag "${tag}" must not appear in both groups`);
  }
});

test("bug 9: community group contains nations/treaties/identity, never industry terms", () => {
  const community = COMMUNITY_IDENTITY_TAG_SUGGESTIONS.join(" ").toLowerCase();
  for (const expected of ["first nations", "métis", "inuit", "treaty"]) {
    assert.ok(community.includes(expected), `community group should include "${expected}"`);
  }
  for (const forbidden of ["hospitality", "human resources", "gaming", "recruitment", "training"]) {
    assert.ok(!community.includes(forbidden), `community group must not include industry term "${forbidden}"`);
  }
});

test("bug 9: industry group contains sector terms, never community-identity terms", () => {
  const industry = INDUSTRY_TAG_SUGGESTIONS.join(" ").toLowerCase();
  for (const expected of ["hospitality", "food & beverage", "human resources", "gaming industry"]) {
    assert.ok(industry.includes(expected), `industry group should include "${expected}"`);
  }
  for (const forbidden of ["first nations", "métis", "inuit", "treaty"]) {
    assert.ok(!industry.includes(forbidden), `industry group must not include community term "${forbidden}"`);
  }
});

/* Bug 10 — canonical org slug redirects. */
test("bug 10: alias slug resolves to its canonical slug", () => {
  assert.equal(canonicalOrgSlug("estons-place"), "eston-s-place");
});

test("bug 10: canonical and unknown slugs pass through unchanged", () => {
  assert.equal(canonicalOrgSlug("eston-s-place"), "eston-s-place");
  assert.equal(canonicalOrgSlug("some-other-org"), "some-other-org");
});

test("bug 10: redirect entries are permanent and cover every alias in the map", () => {
  const entries = orgSlugRedirectEntries();
  assert.equal(entries.length, Object.keys(ORG_SLUG_ALIASES).length);
  for (const [alias, canonical] of Object.entries(ORG_SLUG_ALIASES)) {
    const entry = entries.find((e) => e.source === `/org/${alias}`);
    assert.ok(entry, `missing redirect entry for alias /org/${alias}`);
    assert.equal(entry.destination, `/org/${canonical}`);
    assert.equal(entry.permanent, true);
  }
});

/* Bug 11 — wizard category list includes Food & Beverage / Restaurant. */
test("bug 11: JOB_AREAS includes Food & Beverage / Restaurant", () => {
  assert.ok((JOB_AREAS as readonly string[]).includes("Food & Beverage / Restaurant"));
});

test("bug 11: legacy 'Food & Beverage' industry wording classifies to the canonical category", () => {
  const result = classifyJobArea({ category: "Food & Beverage" });
  assert.equal(result.category, "Food & Beverage / Restaurant");
  assert.equal(result.source, "category");
});

test("bug 11: explicit Food & Beverage / Restaurant category resolves as-is", () => {
  const result = classifyJobArea({ category: "Food & Beverage / Restaurant" });
  assert.equal(result.category, "Food & Beverage / Restaurant");
});

/* Bug 14 — public contact email separation: public render never leaks the login email. */
test("bug 14: public organization projection excludes the login email", () => {
  const publicOrg = toPublicOrganization({
    id: "uid-1",
    name: "Test Business",
    email: "login-account@example.com", // private sign-in email
    contactEmail: "", // public contact email: prefilled empty, never the login email
    socialLinks: { tiktok: "https://www.tiktok.com/@test", youtube: "https://www.youtube.com/@test" },
  });
  assert.ok(!("email" in publicOrg), "login email must never appear in the public projection");
  assert.equal(publicOrg.contactEmail, "");
  const serialized = JSON.stringify(publicOrg);
  assert.ok(!serialized.includes("login-account@example.com"), "login email must not leak via serialization");
});

test("bug 14: an owner-set public email is the only email ever shown publicly", () => {
  const publicOrg = toPublicOrganization({
    email: "login-account@example.com",
    contactEmail: "team@testbusiness.ca",
  });
  assert.equal(publicOrg.contactEmail, "team@testbusiness.ca");
  assert.ok(!JSON.stringify(publicOrg).includes("login-account@example.com"));
});

/* Bug 19d — one employment-type vocabulary shared by wizard, edit form, and board filter. */
test("bug 19d: EMPLOYMENT_TYPE_OPTIONS is the full aligned vocabulary", () => {
  assert.deepEqual([...EMPLOYMENT_TYPE_OPTIONS], [
    "Full-time", "Part-time", "Contract", "Casual", "Temporary", "Seasonal", "Internship", "Volunteer",
  ]);
  assert.equal(new Set(EMPLOYMENT_TYPE_OPTIONS).size, EMPLOYMENT_TYPE_OPTIONS.length, "no duplicate terms");
});
