import test from "node:test";
import assert from "node:assert/strict";

import {
  getSuperAdminEmailAllowlist,
  isSuperAdminEmail,
  parseSuperAdminEmails,
} from "../src/lib/server/super-admin.ts";

test("parseSuperAdminEmails trims, deduplicates, and normalizes configured emails", () => {
  assert.deepEqual(
    parseSuperAdminEmails(" Boss@Example.com, ops@example.com ; boss@example.com "),
    ["boss@example.com", "ops@example.com"],
  );
});

test("super admin allowlist falls back to the default owner email", () => {
  assert.deepEqual(getSuperAdminEmailAllowlist(""), ["nathan.arias@iopps.ca"]);
  assert.equal(isSuperAdminEmail("nathan.arias@iopps.ca", ""), true);
});

test("super admin checks honor explicit env overrides", () => {
  const envValue = "owner@example.com,admin@example.com";
  assert.equal(isSuperAdminEmail("admin@example.com", envValue), true);
  assert.equal(isSuperAdminEmail("nathan.arias@iopps.ca", envValue), false);
});
