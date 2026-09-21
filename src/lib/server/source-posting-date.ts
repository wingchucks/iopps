/** Validate calendar-only input before Date can silently roll it into another month.
 * Timestamp inputs retain their full instant and never gain calendar provenance. */
export function sourcePublishedAtPatch(value: unknown): { publishedAt?: Date } {
  if (typeof value !== "string" || !value.trim()) return {};
  const original = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(original) && !sourcePostingDatePatch(original).sourcePostingDate) return {};
  const publishedAt = new Date(original);
  return Number.isFinite(publishedAt.getTime()) ? { publishedAt } : {};
}

/** Call only with the original posting-date source value, before timestamp coercion
 * or truncation. A midnight instant is not evidence of a calendar-only date. */
export function sourcePostingDatePatch(value: unknown): { sourcePostingDate?: string } {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return {};
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return {};
  return { sourcePostingDate: value };
}
