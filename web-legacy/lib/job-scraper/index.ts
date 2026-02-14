/**
 * Job Scraper Module
 *
 * Shared utilities for RSS feed processing and job scraping.
 * Used by:
 * - /api/jobs/scrape (manual scrape)
 * - /api/cron/sync-feeds (scheduled sync)
 * - /api/feeds/detect-fields (field detection)
 */

export * from "./types";
export * from "./utils";
