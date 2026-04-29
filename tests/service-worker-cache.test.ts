import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serviceWorkerSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("service worker does not cache Next.js JavaScript chunks", () => {
  assert.doesNotMatch(serviceWorkerSource, /\/_next\/static\//);
  assert.doesNotMatch(serviceWorkerSource, /js\|css/);
});

test("service worker cache version clears prior stale chunk caches", () => {
  assert.match(serviceWorkerSource, /CACHE_NAME\s*=\s*"iopps-v3"/);
});
