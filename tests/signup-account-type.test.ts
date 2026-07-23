import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

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
  assert.match(signupSource, /accountType: role === "community" \? "community" : orgType === "school" \? "school" : "employer"/);
  assert.doesNotMatch(signupSource, /accountType: role === "community" \? "individual"/);
});

test("recovery verifies missing profile eligibility on the server before changing account type", () => {
  assert.match(profileApiSource, /memberProfileExists: memberDoc\.exists/);
  assert.match(signupSource, /eligibility\.memberProfileExists !== false/);
  assert.match(signupSource, /router\.replace\("\/login"\)/);
});
