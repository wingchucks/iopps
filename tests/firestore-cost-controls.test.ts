import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PUBLIC_DETAIL_CACHE_CONTROL,
  PUBLIC_DETAIL_CACHE_SECONDS,
} from "../src/lib/server/public-detail-cache.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public detail cache policy is bounded and CDN-safe", () => {
  // Related jobs must drop a closed listing promptly: a short window, never a day of stale reuse.
  assert.equal(PUBLIC_DETAIL_CACHE_SECONDS, 60);
  assert.equal(
    PUBLIC_DETAIL_CACHE_CONTROL,
    "public, s-maxage=60, stale-while-revalidate=60",
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
  const related = read("../src/app/api/jobs/[id]/related/route.ts");
  assert.match(related, /withPublicDetailCache/);
  // No ISR layer on top of the short CDN window.
  assert.doesNotMatch(related, /export const revalidate/);
  assert.match(related, /export const dynamic = "force-dynamic"/);
});
