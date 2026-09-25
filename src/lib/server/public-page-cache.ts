import { unstable_cache } from "next/cache";
import { getLatestJobs, getPartners } from "@/lib/server/landing-content";
import { generateJobJsonLd, generateJobMetadata } from "@/lib/server/detail-metadata";

// Public, non-personalized Firestore reads shared across requests for a short
// window. Pages stay dynamic; the job detail content itself still loads live
// from the no-store job API, so only homepage cards and SEO metadata can lag.
export const PUBLIC_PAGE_CACHE_SECONDS = 300;

const jobsCache = { revalidate: PUBLIC_PAGE_CACHE_SECONDS, tags: ["public-jobs"] };

export const getCachedLatestJobs = unstable_cache(getLatestJobs, ["landing-latest-jobs"], jobsCache);
export const getCachedPartners = unstable_cache(getPartners, ["landing-partners"], { revalidate: PUBLIC_PAGE_CACHE_SECONDS, tags: ["public-partners"] });
export const getCachedJobMetadata = unstable_cache(generateJobMetadata, ["job-detail-metadata"], jobsCache);
export const getCachedJobJsonLd = unstable_cache(generateJobJsonLd, ["job-detail-json-ld"], jobsCache);
