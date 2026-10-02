type Job = Record<string, unknown>;
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
/** Strict calendar parsing, independent of the server/browser timezone. */
// Full names and unambiguous abbreviations of three or more letters ("Sep", "Sept.").
function monthNumber(name: string): number {
  const key = name.toLowerCase();
  return key.length >= 3 ? MONTHS.findIndex(month => month.startsWith(key)) + 1 : 0;
}
function calendarDate(value: string): string | null {
  const raw = value.trim().replace(/(\d)(st|nd|rd|th)/gi, '$1');
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const named = raw.match(/^([a-z]+)\.? (\d{1,2}),? (\d{4})$/i);
  const reverse = raw.match(/^(\d{1,2}) ([a-z]+)\.? (\d{4})$/i);
  if (!iso && !named && !reverse) return null;
  const year = Number(iso?.[1] || named?.[3] || reverse?.[3]);
  const month = iso ? Number(iso[2]) : monthNumber(named?.[1] || reverse?.[2] || '');
  const day = Number(iso?.[3] || named?.[2] || reverse?.[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && month > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0,10) : null;
}
// Saskatchewan keeps UTC-6 all year (no daylight saving time).
const SASKATCHEWAN_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** End (exclusive) of the Saskatchewan calendar day that contains `time`. */
export function saskatchewanDayEnd(time: number): number {
  return (Math.floor((time - SASKATCHEWAN_OFFSET_MS) / DAY_MS) + 1) * DAY_MS + SASKATCHEWAN_OFFSET_MS;
}

/**
 * When a listing date stops applying, in ms: a calendar date lasts until the end
 * of that day in Saskatchewan (as expiry does); an instant is itself. Null when
 * the value is not a date.
 */
export function listingDateEnd(value: unknown): number | null {
  if (typeof value === "string") {
    const day = calendarDate(value);
    if (day) return saskatchewanDayEnd(Date.parse(`${day}T12:00:00Z`));
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && typeof value === "object") {
    const record = value as { toDate?: unknown; seconds?: unknown };
    if (typeof record.toDate === "function") return listingDateEnd((record.toDate as () => Date)());
    if (record.seconds !== undefined) return listingDateEnd(Number(record.seconds) * 1000);
  }
  return null;
}

/**
 * Human display of a listing date. A calendar date ("2026-09-10", "Sep 10, 2026")
 * is a day, shown as that same day everywhere; an instant is shown in the same
 * Saskatchewan time zone that expiry uses.
 */
export function formatListingDay(value: unknown, month: "short" | "long" = "short"): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const day = calendarDate(value);
  const date = day ? new Date(`${day}T12:00:00Z`) : new Date(value);
  if (!Number.isFinite(date.getTime())) return value.trim();
  return date.toLocaleDateString("en-CA", { year: "numeric", month, day: "numeric", timeZone: "America/Regina" });
}
/** Deliberately narrow: a deadline label followed immediately by a full date.
 * Never infer an application cutoff from employment terms or a yearless date. */
export function descriptionApplicationDeadline(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/<\/?(?:p|div|br|li)\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/[^\S\n]+/g, ' ');
  if (/open until filled|until (?:the )?position is filled/i.test(text)) return null;
  const month = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
  const date = `(?:\\d{4}-\\d{2}-\\d{2}|${month} \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}|\\d{1,2} ${month} \\d{4})`;
  const pattern = new RegExp(`(?:\\b(?:application deadline|applications? close|closing date|apply by)|(?:^|[.!?;\\n]\\s*)deadline(?: is)?)\\s*:?\\s*(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+)?(${date})\\b`, 'gi');
  const dates = [...text.matchAll(pattern)].map(match => calendarDate(match[1]));
  // Conflicting deadlines require a human to identify the current intake.
  return dates.length && dates.every(date => date && date === dates[0]) ? dates[0] : null;
}

export function isJobRecordExpired(job: Job, now = new Date()): boolean {
  const applicationDates = [job.closingDate, job.deadline, job.applicationDeadline];
  if ([...applicationDates, job.expiresAt].some(value => hasJobExpired(value, now))) return true;
  // A structured value (including open-until-filled) is authoritative over old prose.
  if (applicationDates.some(value => value != null && String(value).trim() !== '')) return false;
  return hasJobExpired(descriptionApplicationDeadline(job.description), now);
}
export function hasJobExpired(value: unknown, now = new Date()): boolean {
  if (!value) return false;
  if (typeof value === 'string') {
    const calendar = calendarDate(value);
    if (calendar) {
      const day = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Regina',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
      return calendar < day;
    }
    // Only explicit timezone-bearing ISO instants may bypass calendar parsing.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) || !calendarDate(value.slice(0,10))) return false;
  }
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') date = value.toDate();
  else if (typeof value === 'string') date = new Date(value);
  else return false;
  return Number.isFinite(date.getTime()) && date.getTime() <= now.getTime();
}
