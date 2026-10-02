import type { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { isPublicPostVisible } from "@/lib/access-state";
import { getAdminDb, hasAdminRuntimeSupport } from "@/lib/firebase-admin";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";
import { mergePublicJobRecords } from "@/lib/public-job-merge";
import { buildPublicJobRouteSlugMap } from "@/lib/public-jobs";
import { withPublicReadTimeout } from "@/lib/public-read-timeout";
import { normalizeImportedDescription } from "@/lib/server/imported-job-descriptions";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import { projectPublicJobDiscovery } from "@/lib/server/public-job-discovery-projection";
import { loadPublicJobDocuments } from "@/lib/server/public-job-documents";
import { getPublicOpportunities } from "@/lib/server/public-opportunities";
import {
  dedupeSitemap,
  isIndexableOrganization,
  isIndexableRecord,
  organizationPublicPath,
  publicPostPath,
  recordLastModified,
  safePublicSlug,
  type DiscoverableRecord,
  type SitemapChangeFrequency,
} from "@/lib/server/discoverability";

// Regenerated hourly, so new listings appear and closed ones leave without a deploy.
export const revalidate = 3600;

const BASE_URL = "https://www.iopps.ca";
const SECTION_TIMEOUT_MS = 20_000;

const STATIC_PAGES = [
  "", "/jobs", "/events", "/conference", "/scholarships",
  "/stories", "/partners", "/businesses",
  "/livestreams",
  "/for-employers", "/about", "/contact", "/pricing", "/privacy", "/terms",
] as const;

type Firestore = FirebaseFirestore.Firestore;
type EntrySpec = { priority: number; changeFrequency: SitemapChangeFrequency };

function entryForRecord(record: DiscoverableRecord, path: string, spec: EntrySpec): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: recordLastModified(record),
    changeFrequency: spec.changeFrequency,
    priority: spec.priority,
  };
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, serialize(entry)]));
  }
  return value;
}

/** The public jobs and route slugs of the /jobs directory (same projection as /api/jobs). */
async function jobEntries(db: Firestore): Promise<MetadataRoute.Sitemap> {
  const { jobs, posts } = await loadPublicJobDocuments(db);
  const record = (doc: FirebaseFirestore.DocumentSnapshot, source: "jobs" | "posts") => {
    const data = doc.data() || {};
    const job = serialize({ id: doc.id, ...data }) as DiscoverableRecord & { id: string };
    job.slug = buildJobRouteSlug({
      id: doc.id,
      slug: typeof job.slug === "string" ? job.slug : undefined,
      title: typeof job.title === "string" ? job.title : undefined,
    });
    if (!job.employerName) job.employerName = job.orgName || job.companyName || "";
    if (typeof job.description === "string") {
      job.description = normalizeImportedDescription(job.description, job.descriptionFormat);
      job.descriptionFormat = "plain-text";
    }
    job._source = source;
    if (source === "jobs") job.active = data.active === true;
    return job;
  };
  const publicJobs = mergePublicJobRecords(jobs.map(doc => record(doc, "jobs")), posts.map(doc => record(doc, "posts")));
  const routes = buildPublicJobRouteSlugMap(publicJobs.map(job => ({
    id: job.id,
    slug: typeof job.slug === "string" ? job.slug : undefined,
    title: typeof job.title === "string" ? job.title : undefined,
  })));
  return projectPublicJobDiscovery(publicJobs).flatMap(job => {
    const route = safePublicSlug({ slug: routes.get(job.id) });
    return route && isIndexableRecord(job) ? [entryForRecord(job, `/jobs/${route}`, { priority: 0.8, changeFrequency: "daily" })] : [];
  });
}

/** Directory items with the directory's own visibility and links. */
async function opportunityEntries(db: Firestore, kind: "events" | "scholarships"): Promise<MetadataRoute.Sitemap> {
  const items = await getPublicOpportunities(kind, true, db);
  return items.flatMap(item => {
    // A closed scholarship intake keeps its page for visitors but is not indexed.
    if (item.intakeClosed === true || !isIndexableRecord(item)) return [];
    const slug = safePublicSlug(item);
    return slug ? [entryForRecord(item, `/${kind}/${slug}`, { priority: 0.8, changeFrequency: kind === "events" ? "daily" : "weekly" })] : [];
  });
}

async function organizationEntries(db: Firestore): Promise<MetadataRoute.Sitemap> {
  const snapshot = await db.collection("organizations").get();
  return snapshot.docs.flatMap(doc => {
    const record = { id: doc.id, ...doc.data() } as DiscoverableRecord;
    const indexable = isIndexableOrganization(record, candidate => isOrganizationPubliclyVisible(
      candidate as Parameters<typeof isOrganizationPubliclyVisible>[0],
    ));
    const path = indexable ? organizationPublicPath(record) : null;
    return path && !path.startsWith("/schools/") ? [entryForRecord(record, path, { priority: 0.6, changeFrequency: "weekly" })] : [];
  });
}

/** Stories and spotlights the stories page and /api/posts show publicly. */
async function storyEntries(db: Firestore): Promise<MetadataRoute.Sitemap> {
  const snapshot = await db.collection("posts").where("type", "in", ["story", "spotlight"]).get();
  return snapshot.docs.flatMap(doc => {
    const record = { id: doc.id, ...doc.data() } as DiscoverableRecord;
    if (!isPublicPostVisible(record) || !isIndexableRecord(record)) return [];
    const path = publicPostPath(record);
    return path ? [entryForRecord(record, path, { priority: 0.6, changeFrequency: "weekly" })] : [];
  });
}

/**
 * A runtime read failure fails the regeneration, so the last good sitemap keeps
 * being served instead of one without this section. Only a build, which must
 * not fail on a transient read, publishes without it until the next hour.
 */
function failUnlessBuilding(label: string, error: unknown): void {
  if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
  console.error(`Sitemap: failed to read ${label} during build:`, error);
}

async function section(label: string, read: () => Promise<MetadataRoute.Sitemap>): Promise<MetadataRoute.Sitemap> {
  try {
    return await withPublicReadTimeout(read, `Sitemap ${label}`, SECTION_TIMEOUT_MS)();
  } catch (error) {
    failUnlessBuilding(label, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" || path === "/events" ? 0.9 : 0.7,
  }));
  if (!hasAdminRuntimeSupport()) return staticEntries;
  let db: Firestore;
  try {
    db = getAdminDb();
  } catch (error) {
    failUnlessBuilding("Firestore", error);
    return staticEntries;
  }
  const sections = await Promise.all([
    section("jobs", () => jobEntries(db)),
    section("events", () => opportunityEntries(db, "events")),
    section("scholarships", () => opportunityEntries(db, "scholarships")),
    section("organizations", () => organizationEntries(db)),
    section("stories", () => storyEntries(db)),
  ]);
  return dedupeSitemap([...staticEntries, ...sections.flat()]);
}
