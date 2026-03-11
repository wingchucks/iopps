import { buildJobRouteSlug } from "@/lib/server/job-slugs";

type JobLike = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  active?: boolean | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  postedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  order?: number | null;
};

type JobVisibilityLike = Pick<JobLike, "active" | "status">;
type JobRecencyLike = Pick<JobLike, "createdAt" | "updatedAt" | "postedAt" | "publishedAt" | "order">;
type JobRouteLike = {
  id: string;
  slug?: string | null;
  title?: string | null;
};

const HIDDEN_JOB_STATUSES = new Set([
  "archived",
  "cancelled",
  "canceled",
  "closed",
  "completed",
  "deleted",
  "draft",
  "expired",
  "inactive",
  "removed",
]);

function normalizeStatus(status?: string | null): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function toTimestamp(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object" && value !== null) {
    if ("seconds" in (value as Record<string, unknown>)) {
      const seconds = Number((value as Record<string, unknown>).seconds);
      return Number.isNaN(seconds) ? 0 : seconds * 1000;
    }
    if ("toDate" in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).toDate === "function") {
      const date = ((value as Record<string, unknown>).toDate as () => Date)();
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
  }
  return 0;
}

export function isPublicJobVisible(job: JobVisibilityLike): boolean {
  if (job.active === false) return false;
  return !HIDDEN_JOB_STATUSES.has(normalizeStatus(job.status));
}

export function sortJobsByRecency<T extends JobRecencyLike>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const aTime = Math.max(
      toTimestamp(a.updatedAt),
      toTimestamp(a.publishedAt),
      toTimestamp(a.postedAt),
      toTimestamp(a.createdAt),
      typeof a.order === "number" ? a.order : 0,
    );
    const bTime = Math.max(
      toTimestamp(b.updatedAt),
      toTimestamp(b.publishedAt),
      toTimestamp(b.postedAt),
      toTimestamp(b.createdAt),
      typeof b.order === "number" ? b.order : 0,
    );
    return bTime - aTime;
  });
}

export function buildPublicJobRouteSlugMap<T extends JobRouteLike>(
  jobs: T[],
): Map<string, string> {
  const counts = new Map<string, number>();

  jobs.forEach((job) => {
    const baseSlug = buildJobRouteSlug(job);
    counts.set(baseSlug, (counts.get(baseSlug) || 0) + 1);
  });

  return new Map(
    jobs.map((job) => {
      const baseSlug = buildJobRouteSlug(job);
      const uniqueSlug = (counts.get(baseSlug) || 0) > 1 ? `${baseSlug}--${job.id}` : baseSlug;
      return [job.id, uniqueSlug];
    }),
  );
}

export function parsePublicJobRouteSlug(value: string): { exactId: string | null; baseSlug: string } {
  const delimiter = "--";
  const index = value.lastIndexOf(delimiter);
  if (index === -1) {
    return { exactId: null, baseSlug: value };
  }

  return {
    baseSlug: value.slice(0, index),
    exactId: value.slice(index + delimiter.length) || null,
  };
}
