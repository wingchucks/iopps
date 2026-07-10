import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

test("partners and livestreams declare canonical metadata without duplicating the root title suffix", () => {
  const partners = readFileSync(path.join(root, "src", "app", "partners", "layout.tsx"), "utf8");
  const livestreams = readFileSync(path.join(root, "src", "app", "livestreams", "layout.tsx"), "utf8");

  assert.match(partners, /alternates:\s*\{\s*canonical:\s*["']\/partners["']/);
  assert.match(livestreams, /title:\s*["']Livestreams — Watch & Hire IOPPS["']/);
  assert.doesNotMatch(livestreams, /title:[^\n]*\| IOPPS/);
});

test("missing scholarship detail metadata is noindex", () => {
  const scholarship = readFileSync(path.join(root, "src/app/scholarships/[slug]/page.tsx"), "utf8");
  const missingRecordBranch = scholarship.match(/if \(!scholarship\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.match(missingRecordBranch, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
});
