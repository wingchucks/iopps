/* Pure helpers for employer dashboard statistics.
   Shared by the /api/employer/stats route and the Overview/Analytics tabs so
   the hydration contract — loading skeleton, then real values, never silent
   empty labels — is pinned down and unit-testable offline. */

export interface DashboardStats {
  totalPosts: number;
  activePosts: number;
  applications: number;
  profileViews: number;
}

export const EMPTY_STATS: DashboardStats = {
  totalPosts: 0,
  activePosts: 0,
  applications: 0,
  profileViews: 0,
};

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

/**
 * Coerce an unknown stats payload into a fully-populated DashboardStats.
 * Guards the Overview cards against partial/malformed payloads so a value
 * cell never renders empty or undefined.
 */
export function sanitizeStats(raw: unknown): DashboardStats {
  const s =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  return {
    totalPosts: toCount(s.totalPosts),
    activePosts: toCount(s.activePosts),
    applications: toCount(s.applications),
    profileViews: toCount(s.profileViews),
  };
}

export interface JobStatRecord {
  id: string;
  status?: unknown;
  active?: unknown;
  deletedAt?: unknown;
}

/**
 * A job/post record is visible on the dashboard unless it carries a
 * deletion tombstone (status === "deleted" or deletedAt set). Mirrors the
 * filter used by /api/employer/dashboard and the Jobs list.
 */
export function isVisibleJobRecord(record: {
  status?: unknown;
  deletedAt?: unknown;
}): boolean {
  return record.status !== "deleted" && !record.deletedAt;
}

function isActiveJobRecord(record: {
  status?: unknown;
  active?: unknown;
}): boolean {
  return record.active === true || record.status === "active";
}

/**
 * Return the visible records, deduplicated by id. A job can be mirrored
 * across the `jobs` and `posts` collections; it must count once.
 */
export function visibleJobRecords<T extends JobStatRecord>(records: T[]): T[] {
  const seen = new Map<string, T>();
  for (const record of records) {
    if (!record || typeof record.id !== "string") continue;
    if (!isVisibleJobRecord(record)) continue;
    if (!seen.has(record.id)) seen.set(record.id, record);
  }
  return [...seen.values()];
}

/**
 * Aggregate visible job records into post counts. Application totals are
 * added by the caller (the stats route sums per-job application queries).
 */
export function computeJobStats(records: JobStatRecord[]): {
  totalPosts: number;
  activePosts: number;
} {
  const visible = visibleJobRecords(records);
  return {
    totalPosts: visible.length,
    activePosts: visible.filter(isActiveJobRecord).length,
  };
}
