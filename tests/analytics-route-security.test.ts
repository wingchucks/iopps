import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

test("public analytics writes require App Check and commit atomically", () => {
  const route = readFileSync(path.join(root, "src", "app", "api", "analytics", "event", "route.ts"), "utf8");
  assert.match(route, /verifyRequiredAppCheckFromRequest/);
  assert.match(route, /if \(!appCheckValid\)/);
  assert.match(route, /adminDb\.batch\(\)/);
  assert.match(route, /await batch\.commit\(\)/);
  assert.doesNotMatch(route, /Promise\.all\(writes\)/);
});

test("analytics client sends an App Check token with fetch and never uses an unprotected beacon", () => {
  const client = readFileSync(path.join(root, "src", "lib", "analytics", "client.ts"), "utf8");
  assert.match(client, /getAppCheckTokenValue/);
  assert.match(client, /X-Firebase-AppCheck/);
  assert.doesNotMatch(client, /sendBeacon/);
});
