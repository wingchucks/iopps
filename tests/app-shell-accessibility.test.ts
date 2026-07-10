import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
}

test("the app exposes exactly one global main-content landmark", () => {
  const rootLayout = readFileSync(path.join(root, "src", "app", "layout.tsx"), "utf8");
  assert.match(rootLayout, /href=["']#main-content["']/);
  assert.match(rootLayout, /<main\b[^>]*id=["']main-content["']/);

  const nestedMainFiles = tsxFiles(path.join(root, "src", "app"))
    .filter((file) => file !== path.join(root, "src", "app", "layout.tsx"))
    .filter((file) => /<main\b/.test(readFileSync(file, "utf8")));
  assert.deepEqual(nestedMainFiles, [], `nested main landmarks: ${nestedMainFiles.join(", ")}`);

  const appShell = readFileSync(path.join(root, "src", "components", "AppShell.tsx"), "utf8");
  assert.doesNotMatch(appShell, /<main\b|id=["']main-content["']/);
});
