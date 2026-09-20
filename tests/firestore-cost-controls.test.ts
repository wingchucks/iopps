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

test("server metadata deduplicates within a request without retaining withdrawn identities", () => {
  const source = read("../src/lib/server/detail-metadata.ts");
  assert.doesNotMatch(source, /unstable_cache|PUBLIC_DETAIL_CACHE_SECONDS/);
  assert.match(source, /import \{ cache \} from "react"/);
  assert.match(source, /cachedFindFirst/);
});

test("publication and eligibility detail APIs stay fresh; related-job suggestions retain bounded CDN caching", () => {
  for (const route of [
    "../src/app/api/jobs/[id]/route.ts",
    "../src/app/api/events/[id]/route.ts",
    "../src/app/api/scholarships/[id]/route.ts",
  ]) {
    const source = read(route);
    assert.match(source, /"Cache-Control":\s*"no-store"/, `${route} must not serve stale eligibility or unpublished content`);
  }
  assert.match(read("../src/app/api/jobs/[id]/related/route.ts"), /withPublicDetailCache/);
});
