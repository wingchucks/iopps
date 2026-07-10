import test from "node:test";
import assert from "node:assert/strict";

import { getAppCheckConfiguration, shouldEnforceAppCheck } from "../src/lib/firebase/app-check-config.ts";

test("App Check is opt-in and requires a configured Enterprise site key", () => {
  assert.deepEqual(getAppCheckConfiguration(undefined, undefined, "www.iopps.ca"), { enabled: false });
  assert.deepEqual(getAppCheckConfiguration("true", "", "www.iopps.ca"), { enabled: false });
  assert.deepEqual(getAppCheckConfiguration("false", "site-key", "www.iopps.ca"), { enabled: false });
  assert.deepEqual(getAppCheckConfiguration("true", "site-key", "localhost"), { enabled: false });
  assert.deepEqual(getAppCheckConfiguration("true", "site-key", "www.iopps.ca"), {
    enabled: true,
    siteKey: "site-key",
  });
});

test("server enforcement matches the client feature configuration", () => {
  assert.equal(shouldEnforceAppCheck(undefined, undefined, "www.iopps.ca"), false);
  assert.equal(shouldEnforceAppCheck("true", undefined, "www.iopps.ca"), false);
  assert.equal(shouldEnforceAppCheck(undefined, "site-key", "www.iopps.ca"), false);
  assert.equal(shouldEnforceAppCheck("true", "site-key", "localhost"), false);
  assert.equal(shouldEnforceAppCheck("true", "site-key", "www.iopps.ca"), true);
});
