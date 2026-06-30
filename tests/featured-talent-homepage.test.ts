import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("featured talent data keeps Audrey public profile email-only and phone-free", () => {
  const talent = read("src/lib/featured-talent.ts");

  assert.match(talent, /Audrey Fiddler/);
  assert.match(talent, /audrey-fiddler/);
  assert.match(talent, /audreylynnefiddler@outlook\.com/);
  assert.doesNotMatch(talent, /1-639|639-597|597-6123|phone|tel:/i);
});

test("homepage places Featured Talent before the partner network and links to Audrey", () => {
  const home = read("src/app/page.tsx");
  const featuredIndex = home.indexOf("Featured Talent");
  const partnerIndex = home.indexOf("Partner network");

  assert.ok(featuredIndex > -1, "homepage should include Featured Talent copy");
  assert.ok(partnerIndex > -1, "homepage should include the existing partner network section");
  assert.ok(featuredIndex < partnerIndex, "Featured Talent should appear before the next homepage section");
  assert.match(home, /getHomepageFeaturedTalent/);
  assert.match(home, /`\/featured-talent\/\$\{featuredTalent\.slug\}`/);
  assert.match(home, /\/featured-talent/);
  assert.doesNotMatch(home, /1-639|639-597|597-6123|phone|tel:/i);
});

test("public Featured Talent routes exist", () => {
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/[slug]/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/submit/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/app/admin/featured-talent/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "public/featured-talent/audrey-fiddler.jpeg")));
});

test("Featured Talent platform supports profile statuses, categories, homepage selection, and social copy", () => {
  const talent = read("src/lib/featured-talent.ts");

  assert.match(talent, /FeaturedTalentStatus/);
  assert.match(talent, /Open to Work/);
  assert.match(talent, /Student/);
  assert.match(talent, /Entrepreneur/);
  assert.match(talent, /Artist/);
  assert.match(talent, /Community Leader/);
  assert.match(talent, /showOnHomepage/);
  assert.match(talent, /socialShare/);
  assert.match(talent, /getHomepageFeaturedTalent/);
  assert.doesNotMatch(talent, /1-639|639-597|597-6123|phone|tel:/i);
});

test("Featured Talent directory includes submit flow and multiple-profile framework", () => {
  const directory = read("src/app/featured-talent/page.tsx");

  assert.match(directory, /Nominate or submit Featured Talent/);
  assert.match(directory, /\/featured-talent\/submit/);
  assert.match(directory, /featuredTalentCategories\.map/);
  assert.match(directory, /featuredTalentProfiles\.map/);
  assert.doesNotMatch(directory, /1-639|639-597|597-6123|phone|tel:/i);
});

test("Featured Talent submit page explains approval and privacy controls", () => {
  const submit = read("src/app/featured-talent/submit/page.tsx");

  assert.match(submit, /Nominate or submit Featured Talent/);
  assert.match(submit, /email-only public contact/i);
  assert.match(submit, /IOPPS team reviews every profile/i);
  assert.match(submit, /mailto:nathan\.arias@iopps\.ca/);
  assert.doesNotMatch(submit, /1-639|639-597|597-6123|phone|tel:/i);
});

test("Featured Talent admin page is a controls scaffold not a public publishing bypass", () => {
  const admin = read("src/app/admin/featured-talent/page.tsx");

  assert.match(admin, /Featured Talent controls/);
  assert.match(admin, /Homepage feature/);
  assert.match(admin, /Review queue/);
  assert.match(admin, /Social kit/);
  assert.match(admin, /private contact stays hidden/i);
  assert.doesNotMatch(admin, /1-639|639-597|597-6123|tel:/i);
});
