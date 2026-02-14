/**
 * Shared utility functions for job scraping and RSS feed processing
 */

import type { KeywordFilter, JobXML } from "./types";

/**
 * Indigenous-related keywords for filtering job postings
 */
export const INDIGENOUS_KEYWORDS = [
  "indigenous",
  "first nation",
  "first nations",
  "métis",
  "metis",
  "inuit",
  "aboriginal",
  "native",
  "fnmi",
  "reconciliation",
] as const;

/**
 * Check if a job matches the keyword filter criteria
 */
export function matchesKeywordFilter(
  title: string,
  description: string,
  filter?: KeywordFilter
): boolean {
  if (!filter?.enabled) return true;

  const keywords = filter.keywords.length > 0 ? filter.keywords : [...INDIGENOUS_KEYWORDS];
  const searchIn = filter.matchIn.length > 0 ? filter.matchIn : ["title", "description"];

  const textToSearch: string[] = [];
  if (searchIn.includes("title")) textToSearch.push(title.toLowerCase());
  if (searchIn.includes("description")) textToSearch.push(description.toLowerCase());

  const combinedText = textToSearch.join(" ");

  return keywords.some(keyword => combinedText.includes(keyword.toLowerCase()));
}

/**
 * Get value from XML job object using field mapping with dot notation support
 */
export function getXmlFieldValue(
  job: JobXML | Record<string, unknown>,
  fieldName: string | undefined,
  defaultFields: string[]
): string {
  if (fieldName) {
    // Handle dot notation for nested fields
    if (fieldName.includes(".")) {
      const parts = fieldName.split(".");
      let value: unknown = job;
      for (const part of parts) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[part];
        } else {
          break;
        }
      }
      if (Array.isArray(value)) return String(value[0] ?? "");
      return String(value ?? "");
    }

    const value = (job as Record<string, unknown>)[fieldName];
    if (Array.isArray(value)) return String(value[0] ?? "");
    return String(value ?? "");
  }

  // Try default fields in order
  for (const defaultField of defaultFields) {
    const value = (job as Record<string, unknown>)[defaultField];
    if (value) {
      if (Array.isArray(value)) return String(value[0] ?? "");
      return String(value ?? "");
    }
  }

  return "";
}

/**
 * Normalize job type strings to standard values
 */
export function normalizeJobType(type: string): string {
  if (!type) return "Full-time";

  const lower = type.toLowerCase().trim();

  if (lower.includes("full") || lower === "ft" || lower === "f") return "Full-time";
  if (lower.includes("part") || lower === "pt" || lower === "p") return "Part-time";
  if (lower.includes("contract") || lower === "c") return "Contract";
  if (lower.includes("temp") || lower === "t") return "Temporary";
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("freelance")) return "Freelance";
  if (lower.includes("seasonal")) return "Seasonal";

  return type;
}

/**
 * Extract location string from various location fields
 */
export function extractLocation(
  city?: string,
  state?: string,
  country?: string,
  location?: string
): string {
  if (location) return location.trim();

  const parts: string[] = [];
  if (city) parts.push(city.trim());
  if (state) parts.push(state.trim());
  if (country && country.toLowerCase() !== "canada") parts.push(country.trim());

  return parts.join(", ") || "Canada";
}

/**
 * Check if a string indicates remote work
 */
export function isRemotePosition(
  remoteField?: string,
  location?: string,
  title?: string
): boolean {
  const fieldsToCheck = [remoteField, location, title]
    .filter(Boolean)
    .map(s => s!.toLowerCase());

  const remoteIndicators = ["remote", "work from home", "wfh", "anywhere", "virtual"];

  return fieldsToCheck.some(field =>
    remoteIndicators.some(indicator => field.includes(indicator))
  );
}

/**
 * Clean HTML from text content
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a unique job ID from URL or title
 */
export function generateJobId(url: string, title: string, employerId: string): string {
  const source = url || title;
  const hash = source
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  return `${employerId}_${hash}_${Date.now().toString(36)}`;
}

/**
 * Parse expiration date from various formats
 */
export function parseExpirationDate(dateStr?: string, daysFromNow?: number): Date | null {
  if (daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  if (!dateStr) return null;

  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {
    // Invalid date format
  }

  return null;
}

/**
 * Add UTM tracking parameters to a URL
 */
export function addUtmTracking(url: string, utmTag?: string): string {
  if (!utmTag || !url) return url;

  try {
    const urlObj = new URL(url);
    const separator = urlObj.search ? "&" : "?";
    return `${url}${separator}${utmTag}`;
  } catch {
    // Invalid URL, return as-is
    return url;
  }
}
