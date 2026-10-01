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
