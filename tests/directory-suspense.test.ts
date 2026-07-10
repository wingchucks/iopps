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
    assert.match(source, /<Suspense(?:\s|>)/, `${route} must render a Suspense boundary`);
    assert.match(source, /function\s+\w+PageContent\s*\(/, `${route} must isolate useSearchParams hooks in a child component`);
  }
});
