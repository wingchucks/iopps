import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSchoolVisibilityPatch,
  getOrganizationPublicHref,
  isSchoolOrganization,
  isSchoolPubliclyVisible,
} from "../src/lib/school-visibility.ts";

test("isSchoolOrganization detects school records across compatibility fields", () => {
  assert.equal(isSchoolOrganization({ type: "school" }), true);
  assert.equal(isSchoolOrganization({ tier: "school" }), true);
  assert.equal(isSchoolOrganization({ plan: "school" }), true);
  assert.equal(isSchoolOrganization({ type: "business" }), false);
});

test("isSchoolPubliclyVisible hides schools when isPublished is false", () => {
  assert.equal(isSchoolPubliclyVisible({ type: "school", isPublished: false }), false);
});

test("isSchoolPubliclyVisible hides schools when legacy publicationStatus is draft", () => {
  assert.equal(
    isSchoolPubliclyVisible({ type: "school", publicationStatus: "DRAFT" }),
    false,
  );
});

test("isSchoolPubliclyVisible hides schools when legacy publicVisibility is hidden", () => {
  assert.equal(
    isSchoolPubliclyVisible({ type: "school", publicVisibility: "hidden" }),
    false,
  );
});

test("isSchoolPubliclyVisible hides schools when directory visibility flags are false", () => {
  assert.equal(
    isSchoolPubliclyVisible({ type: "school", directoryVisible: false }),
    false,
  );
  assert.equal(
    isSchoolPubliclyVisible({ type: "school", isDirectoryVisible: false }),
    false,
  );
});

test("isSchoolPubliclyVisible leaves schools visible when no hide flags are present", () => {
  assert.equal(
    isSchoolPubliclyVisible({ type: "school", id: "siit", name: "SIIT" }),
    true,
  );
});

test("buildSchoolVisibilityPatch writes all compatibility fields together", () => {
  assert.deepEqual(buildSchoolVisibilityPatch(false), {
    isPublished: false,
    publicationStatus: "DRAFT",
    directoryVisible: false,
    isDirectoryVisible: false,
    publicVisibility: "hidden",
  });
  assert.deepEqual(buildSchoolVisibilityPatch(true), {
    isPublished: true,
    publicationStatus: "PUBLISHED",
    directoryVisible: true,
    isDirectoryVisible: true,
    publicVisibility: "public",
  });
});

test("getOrganizationPublicHref routes schools to /schools and businesses to /org", () => {
  assert.equal(
    getOrganizationPublicHref({ id: "siit", slug: "saskatchewan-indian-institute", type: "school" }),
    "/schools/saskatchewan-indian-institute",
  );
  assert.equal(
    getOrganizationPublicHref({ id: "org-1", slug: "northern-lights", type: "business" }),
    "/org/northern-lights",
  );
});
