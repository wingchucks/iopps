import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/lib/server/signup-protection.ts", import.meta.url), "utf8");

test("signup rate-limit transaction reads every counter before writing", () => {
  assert.match(source, /await transaction\.getAll\(\.\.\.limits\.map/);
  assert.doesNotMatch(source, /for \(const limit of RATE_LIMITS\)[\s\S]*?await transaction\.get\(/);
});
