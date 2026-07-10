import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const directoryPages = ["businesses", "events", "jobs", "scholarships", "schools", "training"];

test("directory filter controls have accessible names and result updates are announced", () => {
  for (const route of directoryPages) {
    const source = readFileSync(path.join(root, "src", "app", route, "page.tsx"), "utf8");
    const controls = source.match(/<(?:input|select)\b[\s\S]*?\/>|<select\b[\s\S]*?>/g) ?? [];
    assert.ok(controls.length > 0, `${route} must expose filter controls`);
    for (const control of controls) {
      assert.match(control, /aria-(?:label|labelledby)=/, `${route} has an unnamed input or select: ${control.slice(0, 80)}`);
    }
    assert.match(source, /aria-live=["']polite["']/, `${route} needs a polite result-count live region`);
    assert.match(source, /id=["']directory-results["'][^>]*tabIndex=\{-1\}/, `${route} needs a focusable results target`);
  }
});

test("multi-filter directory updates are atomic", () => {
  const pagination = readFileSync(path.join(root, "src/components/DirectoryPagination.tsx"), "utf8");
  const scholarships = readFileSync(path.join(root, "src/app/scholarships/page.tsx"), "utf8");
  const training = readFileSync(path.join(root, "src/app/training/page.tsx"), "utf8");

  assert.match(pagination, /useDirectoryFilterActions/);
  assert.match(pagination, /Object\.entries\(updates\)/);
  assert.match(scholarships, /setFilters\(\{[\s\S]*closing:[\s\S]*rolling:/);
  assert.match(training, /setFilters\(\{ q: null, category: null, format: null \}\)/);
});
