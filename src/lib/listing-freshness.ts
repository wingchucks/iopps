type Job = Record<string, unknown>;
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
/** Strict calendar parsing, independent of the server/browser timezone. */
function calendarDate(value: string): string | null {
  const raw = value.trim().replace(/(\d)(st|nd|rd|th)/gi, '$1');
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const named = raw.match(/^([a-z]+) (\d{1,2}),? (\d{4})$/i);
  const reverse = raw.match(/^(\d{1,2}) ([a-z]+) (\d{4})$/i);
  if (!iso && !named && !reverse) return null;
  const year = Number(iso?.[1] || named?.[3] || reverse?.[3]);
  const month = iso ? Number(iso[2]) : MONTHS.indexOf((named?.[1] || reverse?.[2] || '').toLowerCase()) + 1;
  const day = Number(iso?.[3] || named?.[2] || reverse?.[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && month > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0,10) : null;
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
