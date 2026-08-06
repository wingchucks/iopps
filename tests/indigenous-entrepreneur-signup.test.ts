import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("entrepreneur CTAs open a guided Indigenous business signup path", () => {
  const home = read("src/app/page.tsx");
  const spotlight = read("src/app/indigenous-business-spotlight/page.tsx");

  assert.match(home, /href="\/signup\?intent=indigenous-business"/);
  assert.match(spotlight, /href="\/signup\?intent=indigenous-business"/);
  assert.match(spotlight, /What makes a profile ready to promote/);
  assert.match(spotlight, /Sign in to finish your business profile/);
});

test("guided signup preselects the entrepreneur path without misclassifying generic signups", () => {
  const signup = read("src/app/signup/page.tsx");

  assert.match(signup, /useSearchParams/);
  assert.match(signup, /intent\) === "indigenous-business"/);
  assert.match(signup, /entrepreneurIntent \? "organization" : ""/);
  assert.match(signup, /entrepreneurIntent \? "employer" : ""/);
  assert.match(signup, /entrepreneurIntent \? "indigenous" : "not_specified"/);
  assert.match(signup, /Indigenous Entrepreneur Signup/);
  assert.match(signup, /Your free business profile and directory listing/);
});

test("entrepreneur signup collects the public profile details needed for discovery", () => {
  const signup = read("src/app/signup/page.tsx");

  assert.match(signup, /empDescription/);
  assert.match(signup, /empWebsite/);
  assert.match(signup, /empServices/);
  assert.match(signup, /Short Business Description/);
  assert.match(signup, /Products or Services/);
  assert.match(signup, /description: empDescription/);
  assert.match(signup, /website: empWebsite/);
  assert.match(signup, /services: empServices/);
  assert.match(signup, /onboardingComplete: true/);
});

test("employer signup API persists guided profile details instead of discarding them", () => {
  const route = read("src/app/api/employer/signup/route.ts");

  for (const field of ["website", "description", "location", "capabilities", "services", "logoUrl", "bannerUrl", "onboardingComplete"]) {
    assert.match(route, new RegExp(`${field}\\?`), `request body should type ${field}`);
  }

  assert.match(route, /const profileSubmitted =/);
  assert.match(route, /onboardingComplete: profileSubmitted/);
  assert.match(route, /\.\.\.\(website \? \{ website \} : \{\}\)/);
  assert.match(route, /\.\.\.\(description \? \{ description \} : \{\}\)/);
  assert.match(route, /\.\.\.\(services\.length > 0 \? \{ services \} : \{\}\)/);
  assert.match(route, /\.\.\.\(location \? \{ location \} : \{\}\)/);
});

test("entrepreneur-facing copy does not add proof requirements or claim all IOPPS promotion is free", () => {
  const combined = [
    read("src/app/page.tsx"),
    read("src/app/indigenous-business-spotlight/page.tsx"),
    read("src/app/signup/page.tsx"),
  ].join("\n");

  assert.doesNotMatch(combined, /proof of|provide proof|verification requirement/i);
  assert.doesNotMatch(combined, /all promotion is free|everything is free|unlimited free promotion/i);
});
