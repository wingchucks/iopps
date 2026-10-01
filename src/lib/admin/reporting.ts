/** Normalize stored reporting dates without treating missing/invalid values as zero. */
export function reportingTimestamp(value: unknown): number | null {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "string" && value.trim()) date = new Date(value);
  else if (typeof value === "number") date = new Date(value);
  else if (value && typeof value === "object") {
    const record = value as {toDate?: () => Date; seconds?: number; _seconds?: number};
    if (typeof record.toDate === "function") {
      try { date = record.toDate(); } catch { return null; }
    } else if (typeof record.seconds === "number") date = new Date(record.seconds * 1000);
    else if (typeof record._seconds === "number") date = new Date(record._seconds * 1000);
    else return null;
  } else return null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
}

export function recordedAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function createdInPeriod(record: Record<string, unknown>, cutoff: number | null, now: number): boolean {
  if (cutoff === null) return true; // All-time counts include undated records.
  const date = reportingTimestamp(record.createdAt);
  return date !== null && date >= cutoff && date <= now;
}

export function adminJobPage(
  records: Array<Record<string, unknown> & {id: string}>,
  status: "active" | "inactive" | null,
  requestedPage: number,
  limit: number,
) {
  const eligible = records.filter(record => record.status !== "deleted" && !record.deletedAt);
  const matching = eligible.filter(record => !status || (status === "active" ? record.active === true : record.active === false));
  matching.sort((a, b) => (reportingTimestamp(b.createdAt) ?? -Infinity) - (reportingTimestamp(a.createdAt) ?? -Infinity) || a.id.localeCompare(b.id));
  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  return {jobs: matching.slice((page - 1) * limit, page * limit), total, page, limit, totalPages};
}
