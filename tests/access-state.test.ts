import test from "node:test";
import assert from "node:assert/strict";

import {
  getOrganizationAccessBlockReason,
  getUserAccessBlockReason,
  isHiddenContentStatus,
  isPublicPostVisible,
  isPublicScholarshipVisible,
} from "../src/lib/access-state.ts";

test("user access block reasons cover deleted, suspended, and auth-disabled accounts", () => {
  assert.equal(
    getUserAccessBlockReason({ status: "deleted" }),
    "This account has been deleted.",
  );
  assert.equal(
    getUserAccessBlockReason({ status: "suspended" }),
    "This account is suspended.",
  );
  assert.equal(
    getUserAccessBlockReason({}, { authDisabled: true }),
    "This account has been disabled.",
  );
});

test("organization access block reasons cover disabled and deleted organizations", () => {
  assert.equal(
    getOrganizationAccessBlockReason({ disabled: true }),
    "This organization is disabled.",
  );
  assert.equal(
    getOrganizationAccessBlockReason({ status: "deleted" }),
    "This organization is no longer active.",
  );
  assert.equal(
    getOrganizationAccessBlockReason({ deletedAt: "2026-04-13T00:00:00.000Z" }),
    "This organization has been deleted.",
  );
});

test("hidden content helpers exclude deleted posts and inactive scholarships", () => {
  assert.equal(isHiddenContentStatus("deleted"), true);
  assert.equal(isPublicPostVisible({ status: "deleted" }), false);
  assert.equal(isPublicPostVisible({ status: "active" }), true);
  assert.equal(isPublicScholarshipVisible({ active: false, status: "active" }), false);
  assert.equal(isPublicScholarshipVisible({ active: true, status: "deleted" }), false);
  assert.equal(isPublicScholarshipVisible({ active: true, status: "published" }), true);
});
