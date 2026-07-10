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
