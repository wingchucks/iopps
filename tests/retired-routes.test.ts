import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("retired mentorship app routes are not present", () => {
  const retiredRouteFiles = [
    "../src/app/mentorship/layout.tsx",
    "../src/app/mentorship/page.tsx",
    "../src/app/mentorship/become/page.tsx",
    "../src/app/mentorship/requests/page.tsx",
  ];

  for (const routeFile of retiredRouteFiles) {
    assert.equal(existsSync(new URL(routeFile, import.meta.url)), false, routeFile);
  }
});

test("middleware does not protect retired mentorship URLs", () => {
  const source = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /["']\/mentorship["']/);
});
