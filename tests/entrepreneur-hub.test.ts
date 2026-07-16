import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath: string) => fs.existsSync(path.join(root, relativePath));

test("entrepreneur hub has public routes, region pages, partner profile, and partner intake", () => {
  assert.equal(exists("src/app/entrepreneurs/page.tsx"), true);
  assert.equal(exists("src/app/entrepreneurs/[region]/page.tsx"), true);
  assert.equal(exists("src/app/entrepreneurs/partners/[slug]/page.tsx"), true);
  assert.equal(exists("src/app/entrepreneurs/partners/apply/page.tsx"), true);
});

test("entrepreneur resource data clearly separates awareness campaigns from posting plans", () => {
  const data = read("src/lib/entrepreneur-resources.ts");
  assert.match(data, /AIIC Entrepreneur Awareness Campaign/);
  assert.match(data, /custom annual awareness contract/i);
  assert.match(data, /not.*Premium jobs plan/i);
  assert.match(data, /not.*unlimited program posting/i);
  assert.match(data, /\$7,500 \+ GST/);
  assert.match(data, /50% IWE \/ 50% IYE/);
  assert.match(data, /Indigenous Youth Entrepreneurs/);
  assert.match(data, /Indigenous Women Entrepreneurs/);
});

test("AIIC proposal document contains a complete service scope and boundaries", () => {
  const proposalPath = "docs/proposals/aiic-entrepreneur-awareness-campaign.md";
  assert.equal(exists(proposalPath), true);
  const proposal = read(proposalPath);
  for (const required of [
    "Dedicated AIIC resource profile",
    "Alberta entrepreneur support placement",
    "Monthly organic social/community promotion",
    "Two larger campaign pushes",
    "One interview / feature package",
    "Pow Wow Trail sponsored segment opportunity",
    "Monthly reporting",
    "not include unlimited program postings",
  ]) {
    assert.match(proposal, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("homepage/navigation make the entrepreneur hub discoverable", () => {
  const navigation = read("src/lib/navigation.ts");
  const homepage = read("src/app/page.tsx");
  assert.match(navigation, /entrepreneurs/);
  assert.match(navigation, /Entrepreneurs/);
  assert.match(homepage, /\/entrepreneurs/);
  assert.match(homepage, /Entrepreneur Supports/);
});
