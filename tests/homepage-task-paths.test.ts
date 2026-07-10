import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const source = readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf8");

test("homepage first screen offers task-first pathways", () => {
  const start = source.indexOf("function FirstScreenActivityLinks");
  const end = source.indexOf("function TrustedPartnerStrip", start);
  const block = source.slice(start, end);

  for (const [label, href] of [
    ["Find work", "/jobs"],
    ["Hire talent", "/for-employers"],
    ["Learn", "/training"],
    ["Events & live", "/events"],
  ]) {
    assert.ok(block.includes(`label: "${label}"`), `missing ${label} pathway`);
    assert.ok(block.includes(`href: "${href}"`), `missing ${href} pathway`);
  }
  assert.match(block, /grid-cols-2/);
  assert.doesNotMatch(source, />\s*Explore Opportunities\s*</);
  assert.match(source, />\s*Browse Jobs\s*</);
});

test("homepage hero cannot force horizontal overflow on narrow mobile screens", () => {
  const heroStart = source.indexOf("function Hero(");
  const heroEnd = source.indexOf("export default async function LandingPage", heroStart);
  const hero = source.slice(heroStart, heroEnd);
  const partnersStart = source.indexOf("function TrustedPartnerStrip");
  const partnersEnd = source.indexOf("function HeroFeaturedTalentCard", partnersStart);
  const partners = source.slice(partnersStart, partnersEnd);

  assert.match(hero, /relative mx-auto grid min-w-0/);
  assert.match(hero, /className="min-w-0 flex flex-col justify-center"/);
  assert.match(partners, /w-full min-w-0 max-w-\[680px\]/);
  assert.match(partners, /max-w-full items-center/);

  const livestream = readFileSync(path.join(process.cwd(), "src", "components", "landing", "LandingLivePreview.tsx"), "utf8");
  assert.match(livestream, /<section[^>]*className="h-full w-full min-w-0 max-w-full"/);
  assert.match(livestream, /<Card className="h-full w-full min-w-0 max-w-full"/);
});
