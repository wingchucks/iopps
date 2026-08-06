import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANONYMOUS_MEMBER_NAME,
  getAdminRoleLabel,
  getPublicAccountTypeLabel,
} from "../src/lib/account-labels.ts";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("public account labels support current and legacy individual records", () => {
  assert.equal(getPublicAccountTypeLabel("community"), "Individual");
  assert.equal(getPublicAccountTypeLabel("member"), "Individual");
  assert.equal(getPublicAccountTypeLabel(undefined), "Individual");
  assert.equal(getPublicAccountTypeLabel("employer"), "Organization / Employer");
  assert.equal(getPublicAccountTypeLabel("admin"), "Admin");
  assert.equal(getAdminRoleLabel("community"), "Individual");
  assert.equal(ANONYMOUS_MEMBER_NAME, "IOPPS Member");
});

test("signup presents the personal account type as Individual", () => {
  const signup = source("src/app/signup/page.tsx");

  assert.match(signup, /label="Individual"/);
  assert.match(
    signup,
    /For people looking for jobs, training, scholarships, events, or professional connections\./,
  );
  assert.doesNotMatch(signup, /label="Community Member"/);
  assert.match(signup, /selected=\{role === "community"\}/);
});

test("public profile role badges use Individual", () => {
  const labels = source("src/lib/account-labels.ts");
  const ownProfile = source("src/app/profile/page.tsx");
  const memberProfile = source("src/app/members/[uid]/page.tsx");
  const sidebar = source("src/components/FeedSidebar.tsx");

  assert.match(labels, /community: "Individual"/);
  for (const file of [ownProfile, memberProfile, sidebar]) {
    assert.match(file, /getPublicAccountTypeLabel/);
    assert.doesNotMatch(file, /"Community Member"/);
  }
});

test("missing display names use IOPPS Member rather than an account-type label", () => {
  const labels = source("src/lib/account-labels.ts");
  assert.match(labels, /ANONYMOUS_MEMBER_NAME = "IOPPS Member"/);

  for (const path of [
    "src/app/api/profile/route.ts",
    "src/app/api/posts/route.ts",
    "src/components/CreatePostModal.tsx",
  ]) {
    const file = source(path);
    assert.match(file, /ANONYMOUS_MEMBER_NAME/);
    assert.doesNotMatch(file, /"Community Member"/);
  }
});

test("admin role labels display Individual while preserving the community enum", () => {
  const adminUsers = source("src/app/admin/users/page.tsx");

  assert.match(adminUsers, /label: "Individuals", value: "community"/);
  assert.match(adminUsers, /label: "Individual", value: "community"/);
  assert.match(adminUsers, /getAdminRoleLabel/);
});

test("persisted community role values remain compatible", () => {
  const signup = source("src/app/signup/page.tsx");
  const adminApi = source("src/app/api/admin/users/route.ts");
  const authProvider = source("src/components/auth/AuthProvider.tsx");

  assert.match(signup, /signupRole: "community"/);
  assert.match(adminApi, /type UserRole = "community" \| "employer" \| "moderator" \| "admin"/);
  assert.match(authProvider, /\|\| "community"/);
});
