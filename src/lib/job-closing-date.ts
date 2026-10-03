import { hasJobExpired } from "@/lib/listing-freshness";

export function isValidClosingDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Today's date (YYYY-MM-DD) in Saskatchewan, the business calendar listing expiry uses. */
export function reginaCalendarDay(now = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Regina", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * True when a job with this closing date would already be closed, using the
 * same Saskatchewan calendar-day rule as listing expiry. Blank means none.
 */
export function isClosingDateBeforeToday(value: unknown, now = new Date()): boolean {
  return hasJobExpired(typeof value === "string" ? value.trim() : value, now);
}

/** True when the closing date is today or earlier, i.e. the job stops accepting applications by tonight. */
export function closesByEndOfToday(value: unknown, now = new Date()): boolean {
  // Saskatchewan has no daylight saving time, so 24 hours later is always tomorrow there.
  return isClosingDateBeforeToday(value, new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

export const PAST_CLOSING_DATE_MESSAGE = "This job's closing date has passed. Choose today or a later closing date, or clear it, before publishing.";
