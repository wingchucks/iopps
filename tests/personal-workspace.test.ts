import test from "node:test";
import assert from "node:assert/strict";

import {
  conflictingOrganizationLink,
  parseLocationText,
  personalIdentityDefaults,
} from "../src/lib/server/personal-workspace.ts";
import {
  describeWorkspace,
  getOrganizationWorkspaceLinks,
  getWorkspaceForPath,
} from "../src/lib/account-navigation.ts";

test("organization setup fills missing personal identity but never overwrites it", () => {
  assert.deepEqual(
    personalIdentityDefaults({ displayName: "Fictional Person", email: "person@example.invalid" }, { displayName: "Fictional Business Ltd", email: "org@example.invalid" }),
    {},
  );
  assert.deepEqual(
    personalIdentityDefaults(undefined, { displayName: " Fictional Contact ", email: "Contact@Example.invalid" }),
    { displayName: "Fictional Contact", email: "contact@example.invalid" },
  );
  assert.deepEqual(personalIdentityDefaults({ displayName: "   " }, { displayName: "Filled" }), { displayName: "Filled" });
});

test("an existing membership in another organization blocks creating a new one", () => {
  assert.equal(conflictingOrganizationLink("uid-a", { role: "community" }, { displayName: "A" }), null);
  // The account's own organization (keyed by uid) is not a conflict.
  assert.equal(conflictingOrganizationLink("uid-a", { orgId: "uid-a", employerId: "uid-a" }, { orgId: "uid-a" }), null);
  assert.equal(conflictingOrganizationLink("uid-a", { orgId: "org-b" }, undefined), "org-b");
  assert.equal(conflictingOrganizationLink("uid-a", undefined, { orgId: "org-c" }), "org-c");
  assert.equal(conflictingOrganizationLink("uid-a", { employerId: "org-d" }, {}), "org-d");
});

test("free-text location becomes the structured city/province used by the profile editor", () => {
  assert.equal(parseLocationText(""), undefined);
  assert.equal(parseLocationText(undefined), undefined);
  assert.deepEqual(parseLocationText("Saskatoon, Saskatchewan"), { city: "Saskatoon", province: "Saskatchewan" });
  assert.deepEqual(parseLocationText("Regina"), { city: "Regina", province: "" });
});

test("navigation keeps the personal profile and adds the organization as a separate workspace", () => {
  assert.equal(getOrganizationWorkspaceLinks({ hasOrg: false }), null);
  const org = getOrganizationWorkspaceLinks({ hasOrg: true, orgId: "org-1", orgSlug: "fictional-cafe", orgName: "Fictional Café", orgType: "business" });
  assert.equal(org?.name, "Fictional Café");
  assert.equal(org?.dashboardHref, "/org/dashboard");
  assert.equal(org?.publicHref, "/org/fictional-cafe");
  // Retired school directory: keep the dashboard, no public school page link.
  assert.equal(getOrganizationWorkspaceLinks({ hasOrg: true, orgId: "s1", orgSlug: "u", orgType: "school" })?.publicHref, null);
});

test("the current workspace follows the page, never a stored selection", () => {
  assert.equal(getWorkspaceForPath("/org/dashboard"), "organization");
  assert.equal(getWorkspaceForPath("/org/dashboard/jobs/new"), "organization");
  assert.equal(getWorkspaceForPath("/org/onboarding"), "organization");
  assert.equal(getWorkspaceForPath("/org/fictional-cafe"), "personal");
  assert.equal(getWorkspaceForPath("/profile"), "personal");
  assert.equal(getWorkspaceForPath("/jobs/abc/apply"), "personal");
  assert.equal(getWorkspaceForPath(null), "personal");
  const org = getOrganizationWorkspaceLinks({ hasOrg: true, orgId: "o", orgName: "Fictional Café" });
  assert.equal(describeWorkspace("organization", org), "Acting as Fictional Café");
  assert.equal(describeWorkspace("personal", org), "Acting as yourself");
  assert.equal(describeWorkspace("organization", null), "Acting as yourself");
});
