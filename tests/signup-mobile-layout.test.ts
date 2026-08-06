import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const signup = readFileSync(join(process.cwd(), "src/app/signup/page.tsx"), "utf8");

test("account password fields stack in a shrinkable mobile grid", () => {
  assert.match(
    signup,
    /className="signup-account-password-grid grid grid-cols-1 gap-5 min-w-0 sm:grid-cols-2"/,
  );
  assert.doesNotMatch(
    signup,
    /<div style=\{\{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 \}\}>\s*<div><FormInput id="password"/,
  );
});
