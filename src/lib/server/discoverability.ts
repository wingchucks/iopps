import type { MetadataRoute } from "next";

export type DiscoverableRecord = Record<string, unknown> & { id?: string };
export type SitemapChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

const HIDDEN_STATUSES = new Set([
  "archived", "blocked", "cancelled", "canceled", "closed", "deleted", "draft",
  "expired", "hidden", "inactive", "pending", "private", "rejected", "removed", "suspended",
]);
const TEST_SOURCES = new Set(["qa", "test", "fixture", "seed-test", "playwright"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function safePublicSlug(record: DiscoverableRecord): string | null {
  const value = text(record.slug) || text(record.id);
  if (!value || value === "." || value === ".." || /[/?#\\]/.test(value)) return null;
  return encodeURIComponent(value);
}

export function isExplicitTestRecord(record: DiscoverableRecord): boolean {
  if (record.isTest === true || record.testData === true) return true;
  const environment = text(record.environment).toLowerCase();
  if (environment && environment !== "production" && environment !== "prod") return true;
  const identifier = [record.id, record.slug].map((value) => text(value).toLowerCase()).join("-");
  if (/(^|[-_])(qa|playwright|fixture)([-_]|$)/.test(identifier)) return true;
  return TEST_SOURCES.has(text(record.source).toLowerCase());
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = (value.toDate as () => Date)();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function isIndexableRecord(record: DiscoverableRecord, now = new Date()): boolean {
  if (isExplicitTestRecord(record) || record.active === false || record.isPublished === false) return false;
  if (HIDDEN_STATUSES.has(text(record.status || record.publicationStatus).toLowerCase())) return false;
  if (record.deletedAt) return false;
  for (const value of [record.endDate, record.endAt, record.expiresAt, record.closingDate, record.deadline]) {
    const expiry = dateValue(value);
    if (expiry && expiry.getTime() < now.getTime()) return false;
  }
  return safePublicSlug(record) !== null;
}

export function isIndexableOrganization(
  record: DiscoverableRecord,
  isPubliclyVisible: (record: DiscoverableRecord) => boolean,
  now = new Date(),
): boolean {
  return isIndexableRecord(record, now) && isPubliclyVisible(record);
}

export function organizationPublicPath(record: DiscoverableRecord): string | null {
  const slug = safePublicSlug(record);
  if (!slug) return null;
  const type = text(record.type || record.organizationType).toLowerCase();
  return type === "school" || type === "college" || type === "university"
    ? `/schools/${slug}`
    : `/org/${slug}`;
}

export function publicPostPath(record: DiscoverableRecord): string | null {
  const type = text(record.type).toLowerCase();
  if (!["job", "story", "spotlight", "conference", "event"].includes(type)) return null;
  const rawId = text(record.id).replace(/^(job|story|spotlight|conference|event)-/, "");
  const slug = safePublicSlug({ ...record, id: rawId });
  if (!slug) return null;
  if (type === "job") return `/jobs/${slug}`;
  if (type === "conference" || type === "event") return `/events/${slug}`;
  return `/stories/${slug}`;
}

export function recordLastModified(record: DiscoverableRecord): Date | undefined {
  for (const value of [record.updatedAt, record.publishedAt, record.postedAt, record.createdAt]) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
      const date = (value.toDate as () => Date)();
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return undefined;
}

export function dedupeSitemap(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    const existing = byUrl.get(entry.url);
    const nextTime = entry.lastModified ? new Date(entry.lastModified).getTime() : 0;
    const currentTime = existing?.lastModified ? new Date(existing.lastModified).getTime() : 0;
    if (!existing || nextTime > currentTime) byUrl.set(entry.url, entry);
  }
  return Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));
}
