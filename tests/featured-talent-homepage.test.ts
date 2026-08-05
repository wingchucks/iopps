import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("former current Featured Talent profile is removed", () => {
  const talent = read("src/lib/featured-talent.ts");
  const home = read("src/app/page.tsx");

  assert.doesNotMatch(talent, /Lauren Moosuk|lauren-moosuk|laurenmoosuk70@gmail\.com/);
  assert.doesNotMatch(home, /Lauren Moosuk|lauren-moosuk|Featured Talent/);
  assert.match(talent, /Audrey Fiddler/);
  assert.match(talent, /isActive: false/);
});

test("homepage section now supports Indigenous businesses", () => {
  const home = read("src/app/page.tsx");
  const spotlightIndex = home.indexOf("Indigenous Business Spotlight");
  const partnerIndex = home.indexOf("Partner network");

  assert.ok(spotlightIndex > -1, "homepage should feature the Indigenous Business Spotlight");
  assert.ok(partnerIndex > -1, "homepage should keep the partner section");
  assert.ok(spotlightIndex < partnerIndex, "business spotlight should appear before partners");
  assert.match(home, /Your business could be featured next/);
  assert.match(home, /Add Your Business Free/);
  assert.match(home, /Browse Indigenous Businesses/);
  assert.match(home, /href="\/businesses\?type=Indigenous"/);
  assert.match(home, /Complete business profiles can also be considered for a free IOPPS spotlight/);
});

test("Indigenous Business Spotlight gives the real signup path and precise free offer", () => {
  const page = read("src/app/indigenous-business-spotlight/page.tsx");

  assert.match(page, /Sign up and choose Organization, then Employer \/ Business/);
  assert.match(page, /Select Indigenous business or employer/);
  assert.match(page, /There is no charge to create the profile, appear in the directory, or be considered for this spotlight/);
  assert.match(page, /href="\/signup"/);
  assert.match(page, /Add Your Business Free/);
  assert.doesNotMatch(page, /proof|document|verification requirement/i);
});

test("old Featured Talent landing route redirects to the business spotlight", () => {
  const oldRoute = read("src/app/featured-talent/page.tsx");

  assert.match(oldRoute, /redirect\("\/indigenous-business-spotlight"\)/);
  assert.ok(fs.existsSync(path.join(root, "src/app/indigenous-business-spotlight/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/[slug]/page.tsx")));
});
