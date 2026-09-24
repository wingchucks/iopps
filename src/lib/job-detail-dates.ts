function calendarDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

/** A calendar value stays a calendar value; instants retain their timestamp semantics. */
function postingValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return calendarDate(value);
  const timestamp = value as { seconds?: number; toDate?: () => Date };
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value)
    : typeof timestamp.toDate === "function" ? timestamp.toDate()
      : typeof timestamp.seconds === "number" ? new Date(timestamp.seconds * 1000) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

/** Ingest contract: sourcePostingDate is a validated YYYY-MM-DD from the employer,
 * not a date guessed from a midnight UTC timestamp. Existing instants remain instants.
 * Shared precedence keeps the visible Original posting and JobPosting date consistent.
 */
export function jobPostingDate(job: object): string | undefined {
  const record = job as Record<string, unknown>;
  return calendarDate(record.sourcePostingDate) || postingValue(record.publishedAt)
    || (record.source === 'feed' && Object.hasOwn(record, 'publication') ? undefined : postingValue(record.postedAt)) || postingValue(record.datePosted);
}

/** Never reinterpret a feed sync/update as a verified source check. */
export function jobDetailDates(job: object): Array<{ label: string; date: string }> {
  const record = job as Record<string, unknown>;
  const rows: Array<[string, unknown]> = [
    ["Originally posted", jobPostingDate(record)],
    ["Added to IOPPS", record.createdAt],
    ["Last source check", record.sourceVerifiedAt],
  ];
  return rows.flatMap(([label, value]) => {
    const normalized = postingValue(value);
    if (!normalized) return [];
    const day = calendarDate(normalized);
    return [{ label, date: day || new Date(normalized).toLocaleDateString("en-CA", { timeZone: "America/Regina" }) }];
  });
}
