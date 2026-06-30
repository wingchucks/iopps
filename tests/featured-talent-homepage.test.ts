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
  assert.match(home, /featuredTalentProfiles\[0\]/);
  assert.match(home, /`\/featured-talent\/\$\{featuredTalent\.slug\}`/);
  assert.match(home, /\/featured-talent/);
  assert.doesNotMatch(home, /1-639|639-597|597-6123|phone|tel:/i);
});

test("public Featured Talent routes exist", () => {
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/app/featured-talent/[slug]/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "public/featured-talent/audrey-fiddler.jpeg")));
});
