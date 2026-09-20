import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const directoryPages = ["businesses", "events", "jobs", "scholarships", "schools", "training"];

test("directory pages using search-parameter hooks render inside Suspense", () => {
  for (const route of directoryPages) {
    const source = readFileSync(path.join(root, "src", "app", route, "page.tsx"), "utf8");
    assert.match(source, /import\s*\{[^}]*Suspense[^}]*\}\s*from\s*["']react["']/, `${route} must import Suspense`);
    const boundary = source.match(/<Suspense\b[^>]*>([\s\S]*?)<\/Suspense>/);
    assert.ok(boundary, `${route} must render a Suspense boundary`);
    const child = boundary[1].match(/<([A-Z]\w*)\b/)?.[1];
    assert.ok(child, `${route} must render its hook-using child inside Suspense`);
    if (["events", "scholarships"].includes(route)) {
      assert.equal(child, "OpportunityDirectory");
      assert.match(source, /import OpportunityDirectory from ["']@\/components\/opportunities\/OpportunityDirectory["']/);
      const shared = readFileSync(path.join(root, "src/components/opportunities/OpportunityDirectory.tsx"), "utf8");
      assert.match(shared, /function OpportunityDirectory\(/);
      assert.match(shared, /useDirectoryFilter\(/);
    } else {
      assert.match(source, new RegExp(`function\\s+${child}\\s*\\(`), `${route} must define the child rendered under Suspense`);
    }
  }
});
