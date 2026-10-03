import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { withPublicReadTimeout } from "@/lib/public-read-timeout";
import { keepCacheRefreshesAlive } from "@/lib/server/cache-refresh-keepalive";
import { buildPublicJobRouteIndex, type PublicJobRouteIndex } from "@/lib/server/public-job-routing";

// Same lifetime and tag as the other public job caches (PUBLIC_PAGE_CACHE_SECONDS).
const ROUTE_INDEX_CACHE_SECONDS = 300;
const ROUTE_INDEX_MEMO_MS = 60_000;

const readCachedRouteIndex = unstable_cache(
  withPublicReadTimeout(async (): Promise<PublicJobRouteIndex> => {
    const builtAt = Date.now();
    return { ...(await buildPublicJobRouteIndex(getAdminDb())), builtAt };
  }, "Public job route index"),
  ["public-job-route-index"],
  { revalidate: ROUTE_INDEX_CACHE_SECONDS, tags: ["public-jobs"] },
);

let memo: { until: number; index: Promise<PublicJobRouteIndex> } | undefined;

/**
 * Shared select()-only route index for public job routes. The per-instance memo
 * also spares nested cache scopes (job metadata, which bypass unstable_cache) a
 * rebuild; findPublicJobDocument merges anything changed after `builtAt`.
 */
export function loadCachedPublicJobRouteIndex(): Promise<PublicJobRouteIndex> {
  keepCacheRefreshesAlive();
  const now = Date.now();
  if (memo && memo.until > now) return memo.index;
  const index = readCachedRouteIndex();
  memo = { until: now + ROUTE_INDEX_MEMO_MS, index };
  index.catch(() => {
    if (memo?.index === index) memo = undefined;
  });
  return index;
}
