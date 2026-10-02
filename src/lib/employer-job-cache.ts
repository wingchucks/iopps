import { revalidateTag } from "next/cache";

/** Homepage job cards and job page metadata are cached under this tag (see server/public-page-cache.ts). */
export const PUBLIC_JOBS_CACHE_TAG = "public-jobs";

/**
 * Server only: expire cached public job data after an employer publishes a job,
 * edits a live one, closes it or deletes it. Route handlers cannot use updateTag;
 * { expire: 0 } makes the next public read wait for fresh data instead of
 * serving the stale copy once more.
 */
export function refreshPublicJobs(): void {
  try {
    revalidateTag(PUBLIC_JOBS_CACHE_TAG, { expire: 0 });
  } catch (error) {
    // The job change is already saved; the cached copy still expires on its own within minutes.
    console.warn("[public-jobs cache] Refresh skipped:", error instanceof Error ? error.message : error);
  }
}
