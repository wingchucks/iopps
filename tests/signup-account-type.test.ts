import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { getStoredAccountType, shouldAllowAccountTypeRecovery } from "../src/lib/account-type.ts";

const root = process.cwd();
const signupSource = readFileSync(path.join(root, "src", "app", "signup", "page.tsx"), "utf8");
const loginSource = readFileSync(path.join(root, "src", "app", "login", "page.tsx"), "utf8");
const profileApiSource = readFileSync(path.join(root, "src", "app", "api", "profile", "route.ts"), "utf8");

test("signup presents plain-language Individual and Organization / Employer choices", () => {
  assert.match(signupSource, /label="Individual"/);
  assert.match(signupSource, /label="Organization \/ Employer"/);
  assert.match(signupSource, /What kind of account do you need\?/);
  assert.match(signupSource, /signing up for yourself or on behalf of an organization/i);
  assert.doesNotMatch(signupSource, /label="Community Member"/);
});

test("account choices stack on narrow screens and use two columns only at the small breakpoint", () => {
  assert.match(signupSource, /className="grid grid-cols-1 sm:grid-cols-2 gap-4"/);
});

test("authenticated accounts without an IOPPS profile return to account-type selection", () => {
  assert.match(loginSource, /if \(!profile\) return "\/signup\?resume=account-type";/);
  assert.match(signupSource, /const isAccountRecovery = Boolean\(user\) &&/);
  assert.match(signupSource, /new URLSearchParams\(window\.location\.search\)\.get\("resume"\) === "account-type"/);
  assert.match(signupSource, /handleRoleContinue/);
  assert.match(signupSource, /accountType: getStoredAccountType\(role, orgType\)/);
  assert.doesNotMatch(signupSource, /accountType: role === "community" \? "individual"/);
});

test("recovery verifies missing profile eligibility on the server before changing account type", () => {
  assert.match(profileApiSource, /memberProfileExists: memberDoc\.exists/);
  assert.match(signupSource, /shouldAllowAccountTypeRecovery\(eligibility\.memberProfileExists\)/);
  assert.match(signupSource, /router\.replace\("\/login"\)/);
});

test("display-label changes preserve existing stored account-type values", () => {
  assert.equal(getStoredAccountType("community", ""), "community");
  assert.equal(getStoredAccountType("organization", "employer"), "employer");
  assert.equal(getStoredAccountType("organization", "school"), "school");
});

test("only a confirmed missing member profile is eligible for account-type recovery", () => {
  assert.equal(shouldAllowAccountTypeRecovery(false), true);
  assert.equal(shouldAllowAccountTypeRecovery(true), false);
  assert.equal(shouldAllowAccountTypeRecovery(undefined), false);
  assert.equal(shouldAllowAccountTypeRecovery(null), false);
});
