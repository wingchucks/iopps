import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PUBLIC_DETAIL_CACHE_CONTROL,
  PUBLIC_DETAIL_CACHE_SECONDS,
} from "../src/lib/server/public-detail-cache.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public detail cache policy is bounded and CDN-safe", () => {
  assert.equal(PUBLIC_DETAIL_CACHE_SECONDS, 900);
  assert.equal(
    PUBLIC_DETAIL_CACHE_CONTROL,
    "public, s-maxage=900, stale-while-revalidate=86400",
  );
});

test("server-side metadata lookups use the shared Next data cache", () => {
  const source = read("../src/lib/server/detail-metadata.ts");
  assert.match(source, /unstable_cache/);
  assert.match(source, /PUBLIC_DETAIL_CACHE_SECONDS/);
  assert.match(source, /cachedFindFirst/);
});

test("high-read public detail APIs emit the shared CDN cache policy", () => {
  for (const route of [
    "../src/app/api/jobs/[id]/route.ts",
    "../src/app/api/jobs/[id]/related/route.ts",
    "../src/app/api/events/[id]/route.ts",
  ]) {
    const source = read(route);
    assert.match(source, /withPublicDetailCache/, `${route} must cache successful public responses`);
  }
});
