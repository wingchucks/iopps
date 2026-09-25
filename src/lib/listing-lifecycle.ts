import { descriptionApplicationDeadline, hasJobExpired, isJobRecordExpired } from "./listing-freshness";

// Agreed 2026-09-25: an expired or closed listing leaves browse, search, feeds and
// recommendations at once, but its page stays with a "Closed" banner. Removed,
// draft, rejected or otherwise unpublished listings are simply no longer available.
// Nothing is deleted.
export type ListingState = "open" | "closed" | "unavailable";

type ListingRecord = Record<string, unknown>;

const CLOSED_STATUSES = new Set(["closed", "expired", "completed", "filled"]);
const OPEN_STATUSES = new Set(["", "active", "published"]);

function statusOf(record: ListingRecord): string {
  return typeof record.status === "string" ? record.status.trim().toLowerCase() : "";
}

/**
 * Lifecycle of a public job, scholarship or event record. Only an explicit closed
 * status or a passed deadline counts as closed; any unknown or unpublished state
 * is unavailable, so a removed listing is never shown again.
 */
export function listingState(record: ListingRecord, now = new Date(), options: { ended?: boolean } = {}): ListingState {
  if (record.deletedAt) return "unavailable";
  const status = statusOf(record);
  if (CLOSED_STATUSES.has(status)) return "closed";
  if (!OPEN_STATUSES.has(status) || record.active === false) return "unavailable";
  return options.ended || isJobRecordExpired(record, now) ? "closed" : "open";
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return asDate((value as { toDate(): Date }).toDate());
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  // A calendar date is a day, not an instant; noon UTC keeps it on that day in Canada.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00Z` : text);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** When applications closed, if known: the earliest passed deadline, else when it was closed. */
export function listingClosedOn(record: ListingRecord, now = new Date()): string | null {
  const passed = [record.closingDate, record.deadline, record.applicationDeadline, record.expiresAt]
    .filter(value => hasJobExpired(value, now))
    .map(asDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (passed[0]) return passed[0].toISOString();
  if (CLOSED_STATUSES.has(statusOf(record))) return (asDate(record.closedAt) || asDate(record.updatedAt))?.toISOString() ?? null;
  // Same rule as expiry: a deadline stated in the description counts when no structured date exists.
  const stated = descriptionApplicationDeadline(record.description);
  return stated && hasJobExpired(stated, now) ? asDate(stated)?.toISOString() ?? null : null;
}
