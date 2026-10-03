/**
 * A date from any form the app receives one in: a Firestore Timestamp, its JSON forms
 * ({seconds, nanoseconds} once cached, {_seconds, _nanoseconds} from server JSON), a
 * Date, milliseconds, or a string. A date-only string ("2026-10-05") is that calendar
 * day where the member is, not midnight UTC, so it never shows as the day before.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toDate === "function") return toDate((record.toDate as () => unknown)());
    const seconds = typeof record.seconds === "number" ? record.seconds : record._seconds;
    if (typeof seconds !== "number") return null;
    const nanos = Number(record.nanoseconds ?? record._nanoseconds ?? 0) || 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
  }
  if (typeof value === "string") {
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatTimestamp(value: unknown): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "";
}

export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
}

/** "Oct 5, 2026 - Oct 8, 2026", or one date when both are the same day. */
export function formatDateRange(start: unknown, end: unknown): string {
  const first = formatTimestamp(start);
  const last = formatTimestamp(end);
  return last && last !== first ? [first, last].filter(Boolean).join(" - ") : first;
}
