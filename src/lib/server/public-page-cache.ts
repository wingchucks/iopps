import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getLatestJobs, getPartners } from "@/lib/server/landing-content";
import { fallbackMetadata, generateJobJsonLd, generateJobMetadata } from "@/lib/server/detail-metadata";
import { loadCachedPublicJobRouteIndex } from "@/lib/public-job-route-cache";
import { publicReadOr, withPublicReadTimeout } from "@/lib/public-read-timeout";

// Public, non-personalized Firestore reads shared across requests for a short
// window. Pages stay dynamic; the job detail content itself still loads live
// from the no-store job API, so only homepage cards and SEO metadata can lag.
// Every cached read is time-bounded and throws on failure, so a failure is never
// cached: a stale entry keeps its last good value and callers render a fallback.
export const PUBLIC_PAGE_CACHE_SECONDS = 300;

const jobsCache = { revalidate: PUBLIC_PAGE_CACHE_SECONDS, tags: ["public-jobs"] };

export const getCachedLatestJobs = unstable_cache(withPublicReadTimeout(getLatestJobs, "Homepage jobs"), ["landing-latest-jobs"], jobsCache);
export const getCachedPartners = unstable_cache(withPublicReadTimeout(getPartners, "Partners"), ["landing-partners"], { revalidate: PUBLIC_PAGE_CACHE_SECONDS, tags: ["public-partners"] });
export const getCachedJobMetadata = unstable_cache(withPublicReadTimeout(generateJobMetadata, "Job metadata"), ["job-detail-metadata"], jobsCache);
export const getCachedJobJsonLd = unstable_cache(withPublicReadTimeout(generateJobJsonLd, "Job JSON-LD"), ["job-detail-json-ld"], jobsCache);

// Metadata caches resolve routes in a nested cache scope, which bypasses
// unstable_cache; reading the shared route index first keeps that nested read memoized.
async function warmJobRoutes(): Promise<void> {
  await loadCachedPublicJobRouteIndex().catch(() => undefined);
}

export async function getJobPageMetadata(slug: string): Promise<Metadata> {
  await warmJobRoutes();
  return publicReadOr(
    `Job metadata for ${slug}`,
    getCachedJobMetadata(slug),
    fallbackMetadata("Job Opportunity", "View this job opportunity on IOPPS.ca.", `/jobs/${slug}`),
  );
}

export async function getJobPageJsonLd(slug: string): Promise<Record<string, unknown> | null> {
  await warmJobRoutes();
  return publicReadOr(`Job JSON-LD for ${slug}`, getCachedJobJsonLd(slug), null);
}
