import { revalidateTag } from "next/cache";

/** Homepage and jobs-page partner cards are cached under this tag (see server/public-page-cache.ts). */
export const PUBLIC_PARTNERS_CACHE_TAG = "public-partners";

/**
 * Server only: expire the cached partner cards after an organization's public listing,
 * status or partner subscription changes. Route handlers cannot use updateTag;
 * { expire: 0 } makes the next public read wait for fresh data instead of serving the
 * stale copy once more.
 */
export function refreshPublicPartners(): void {
  try {
    revalidateTag(PUBLIC_PARTNERS_CACHE_TAG, { expire: 0 });
  } catch (error) {
    // The organization change is already saved; the cached copy still expires on its own within minutes.
    console.warn("[public-partners cache] Refresh skipped:", error instanceof Error ? error.message : error);
  }
}
