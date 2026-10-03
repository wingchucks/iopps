type EventLike = {
  dates?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timeZone?: string | null;
  status?: string | null;
  active?: boolean | null;
};

/** Events without a valid time zone are Saskatchewan events, like listing expiry. */
export const DEFAULT_EVENT_TIME_ZONE = "America/Regina";

const EVENT_TYPE_LABELS: Record<string, string> = {
  "career fair": "Career Fair",
  conference: "Conference",
  cultural: "Round Dance",
  powwow: "Pow Wow",
  "pow wow": "Pow Wow",
  "round dance": "Round Dance",
  sports: "Sports",
  career_fair: "Career Fair",
  round_dance: "Round Dance",
  hockey: "Hockey Tournament",
  workshop: "Workshop / Training",
  networking: "Networking",
  webinar: "Webinar",
  fundraiser: "Fundraiser",
};

const HIDDEN_STATUSES = new Set([
  "archived",
  "cancelled",
  "canceled",
  "closed",
  "completed",
  "deleted",
  "draft",
  "expired",
  "inactive",
  "pending",
  "rejected",
  "suspended",
  "removed",
]);

function parseDateString(value: string, endOfDay = false): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;
    const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (check.toISOString().slice(0, 10) !== trimmed) return null;
    return endOfDay
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay && !/T|\d:\d/.test(trimmed)) parsed.setHours(23, 59, 59, 999);
  return parsed;
}

function parseDatesLabel(label?: string | null): { start: Date | null; end: Date | null } {
  if (!label) return { start: null, end: null };

  const rangeMatch = label.trim().replace(/[–—]/g, "-").match(/^([A-Za-z]+)\s+(\d{1,2})(?:-(\d{1,2}))?,\s*(\d{4})$/);
  if (!rangeMatch) {
    const fallback = parseDateString(label);
    return { start: fallback, end: parseDateString(label, true) };
  }

  const [, month, startDay, endDay, year] = rangeMatch;
  const start = parseDateString(`${month} ${startDay}, ${year}`);
  const end = parseDateString(`${month} ${endDay || startDay}, ${year}`, true);
  return { start, end };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startMonth = start.toLocaleString("en-CA", { month: "short" });
  const endMonth = end.toLocaleString("en-CA", { month: "short" });

  if (sameMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function buildTimeSuffix(event: EventLike): string {
  const startTime = typeof event.startTime === "string" ? event.startTime.trim() : "";
  const endTime = typeof event.endTime === "string" ? event.endTime.trim() : "";
  if (startTime && endTime) return ` • ${startTime} - ${endTime}`;
  if (startTime) return ` • ${startTime}`;
  return "";
}

export function getEventStartDate(event: EventLike): Date | null {
  return (
    parseDateString(event.startDate || "") ||
    parseDateString(event.date || "") ||
    parseDatesLabel(event.dates).start
  );
}

export function getEventEndDate(event: EventLike): Date | null {
  return (
    parseDateString(event.endDate || "", true) ||
    parseDateString(event.startDate || "", true) ||
    parseDateString(event.date || "", true) ||
    parseDatesLabel(event.dates).end
  );
}

export function getEventDisplayDates(event: EventLike): string {
  const explicit = typeof event.dates === "string" ? event.dates.trim() : "";
  if (explicit) return explicit;

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);
  const timeSuffix = buildTimeSuffix(event);

  if (start && end) {
    if (start.toDateString() === end.toDateString()) {
      return `${formatDate(start)}${timeSuffix}`;
    }
    return `${formatDateRange(start, end)}${timeSuffix}`;
  }

  if (start) {
    return `${formatDate(start)}${timeSuffix}`;
  }

  return "";
}

/*
 * Expiry compares wall-clock values in the event's own time zone (or
 * Saskatchewan time), never in the server's time zone. A calendar date ends
 * at the end of that day there; an end time ends the event at that time.
 */
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();
type EventBoundary = { day: string; time?: string } | { instant: Date };

function zoneFormatter(timeZone: string): Intl.DateTimeFormat | null {
  if (!zoneFormatters.has(timeZone)) {
    try {
      zoneFormatters.set(timeZone, new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }));
    } catch {
      return null;
    }
  }
  return zoneFormatters.get(timeZone) ?? null;
}

function eventTimeZone(event: EventLike): string {
  const zone = typeof event.timeZone === "string" ? event.timeZone.trim() : "";
  return zone && zoneFormatter(zone) ? zone : DEFAULT_EVENT_TIME_ZONE;
}

/** "YYYY-MM-DDTHH:mm" for an instant, as a clock in the time zone shows it. */
function wallClock(instant: Date, timeZone: string): string {
  const parts = Object.fromEntries(zoneFormatter(timeZone)!.formatToParts(instant).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

function isoDay(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && month >= 1 && month <= 12 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

function monthNumber(name: string): number {
  const key = name.toLowerCase().replace(/\.$/, "");
  return key.length >= 3 ? MONTH_NAMES.findIndex(month => month.startsWith(key)) + 1 : 0;
}

/** Calendar dates as written ("2026-10-02", "Oct 2, 2026", "2 October 2026"), independent of any time zone. */
function calendarDay(value: string): string | null {
  const raw = value.trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isoDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const named = raw.match(/^([A-Za-z]+\.?)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) return isoDay(Number(named[3]), monthNumber(named[1]), Number(named[2]));
  const reverse = raw.match(/^(\d{1,2})\s+([A-Za-z]+\.?),?\s+(\d{4})$/);
  if (reverse) return isoDay(Number(reverse[3]), monthNumber(reverse[2]), Number(reverse[1]));
  return null;
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** "HH:mm" from "19:30", "7:30 PM" or "7 pm"; anything else is not a usable time. */
function clockTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  const twentyFour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFour) return `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}`;
  const twelve = raw.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])\.?\s*m\.?$/);
  if (!twelve) return null;
  const hour = (Number(twelve[1]) % 12) + (twelve[3] === "p" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${twelve[2] || "00"}`;
}

function boundaryFromInstant(instant: Date, timeZone: string, isEnd: boolean): EventBoundary | null {
  if (!Number.isFinite(instant.getTime())) return null;
  // A stored date-only value (midnight UTC) names its UTC calendar day, not a moment.
  if (instant.toISOString().endsWith("T00:00:00.000Z")) return { day: instant.toISOString().slice(0, 10) };
  return isEnd ? { instant } : { day: wallClock(instant, timeZone).slice(0, 10) };
}

/** Reads one stored date field: a calendar day (with an optional local time) or an absolute instant. */
function readBoundary(value: unknown, timeZone: string, isEnd: boolean): EventBoundary | null {
  if (value instanceof Date) return boundaryFromInstant(value, timeZone, isEnd);
  if (value && typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    return boundaryFromInstant((value as { toDate: () => Date }).toDate(), timeZone, isEnd);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const day = calendarDay(raw);
  if (day) return { day };
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  if (/\d:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})\b/i.test(raw)) return boundaryFromInstant(parsed, timeZone, isEnd);
  // Without an explicit offset the text is a local date (and time): the
  // parser reads it in the process time zone, so its local fields are exactly
  // what was written, whichever time zone the server runs in.
  const pad = (part: number) => String(part).padStart(2, "0");
  const localDay = isoDay(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  if (!localDay) return null;
  const time = isEnd && /\d:\d{2}/.test(raw) ? `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}` : undefined;
  return time ? { day: localDay, time } : { day: localDay };
}

/** The last calendar day named by a legacy label such as "June 12-14, 2026" or "Oct 30 - Nov 2, 2026". */
function labelEndDay(label: unknown, timeZone: string): string | null {
  if (typeof label !== "string") return null;
  const text = label.split("\u2022")[0].replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
  const sameMonth = text.match(/^([A-Za-z]+\.?) (\d{1,2}) ?- ?(\d{1,2}), ?(\d{4})$/);
  if (sameMonth) return calendarDay(`${sameMonth[1]} ${sameMonth[3]}, ${sameMonth[4]}`);
  // "Oct 30 - Nov 2, 2026" and "Dec 30, 2026 - Jan 2, 2027" both end on the second date.
  const parts = text.split(" - ");
  const rangeEnd = parts.length === 2 ? calendarDay(parts[1]) : null;
  if (rangeEnd) return rangeEnd;
  const single = readBoundary(text, timeZone, false);
  return single && "day" in single ? single.day : null;
}

/** When the event is over: its end date (or single day) and end time, read in the event's time zone. */
function eventEndBoundary(event: EventLike, timeZone: string): EventBoundary | null {
  const startTime = clockTime(event.startTime);
  const endTime = clockTime(event.endTime);
  const start = readBoundary(event.startDate, timeZone, false) ?? readBoundary(event.date, timeZone, false);
  const startDay = start && "day" in start ? start.day : null;
  const end = readBoundary(event.endDate, timeZone, true) ?? (startDay ? { day: startDay } : null);
  if (end) {
    if ("instant" in end || end.time || !endTime) return end;
    // A same-day listing that ends at or before it starts runs past midnight.
    const overnight = end.day === startDay && startTime !== null && endTime <= startTime;
    return { day: overnight ? nextDay(end.day) : end.day, time: endTime };
  }
  const labelDay = labelEndDay(event.dates, timeZone);
  return labelDay ? { day: labelDay } : null;
}

/** True once the event's last day (or end time) has passed where it takes place. Unknown dates never end. */
export function hasEventEnded(event: EventLike, now = new Date()): boolean {
  const timeZone = eventTimeZone(event);
  const end = eventEndBoundary(event, timeZone);
  if (!end) return false;
  if ("instant" in end) return now.getTime() > end.instant.getTime();
  return wallClock(now, timeZone) > `${end.day}T${end.time ?? "23:59"}`;
}

export function isEventCompleted(event: EventLike, now = new Date()): boolean {
  const status = typeof event.status === "string" ? event.status.trim().toLowerCase() : "";
  if (HIDDEN_STATUSES.has(status)) return true;
  if (event.active === false) return true;
  return hasEventEnded(event, now);
}

export function isPublicEventVisible(event: EventLike, now = new Date()): boolean {
  return !isEventCompleted(event, now);
}

export function normalizePublicEvent<T extends object>(event: T & EventLike): T & EventLike {
  const dates = getEventDisplayDates(event);
  if (!dates) return event;
  if (typeof event.dates === "string" && event.dates.trim()) return event;
  return { ...event, dates };
}

export function normalizeEventTypeLabel(value?: string | null): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  return EVENT_TYPE_LABELS[normalized] || value!.trim();
}
