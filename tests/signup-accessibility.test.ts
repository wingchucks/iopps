import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

test("signup role and organization choices are native, stateful buttons", () => {
  const source = readFileSync(path.join(root, "src", "components", "signup", "ui.tsx"), "utf8");
  for (const component of ["RoleCard", "OrgTypeCard"]) {
    const start = source.indexOf(`export function ${component}`);
    const nextComponent = source.indexOf("\nexport function ", start + 1);
    const block = source.slice(start, nextComponent === -1 ? source.length : nextComponent);
    assert.ok(start >= 0, `${component} must exist`);
    assert.match(block, /<button\b/);
    assert.match(block, /type=["']button["']/);
    assert.match(block, /aria-pressed=\{selected\}/);
    assert.doesNotMatch(block, /<div onClick=/);
  }
});
