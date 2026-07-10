import type { MetadataRoute } from "next";
import { adminDb } from "@/lib/firebase-admin";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";
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

const BASE_URL = "https://www.iopps.ca";

const STATIC_PAGES = [
  "", "/feed", "/jobs", "/events", "/scholarships", "/training",
  "/stories", "/partners", "/businesses", "/schools", "/education",
  "/shop", "/livestreams", "/spotlight", "/featured-talent",
  "/mentorship", "/for-employers", "/about", "/contact", "/pricing", "/privacy", "/terms",
] as const;

type CollectionSpec = {
  name: string;
  prefix?: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
};

const COLLECTIONS: CollectionSpec[] = [
  { name: "jobs", prefix: "/jobs", priority: 0.8, changeFrequency: "daily" },
  { name: "events", prefix: "/events", priority: 0.8, changeFrequency: "daily" },
  { name: "scholarships", prefix: "/scholarships", priority: 0.8, changeFrequency: "weekly" },
  { name: "training_programs", prefix: "/training", priority: 0.7, changeFrequency: "weekly" },
  { name: "organizations", priority: 0.6, changeFrequency: "weekly" },
  { name: "shop_vendors", prefix: "/shop", priority: 0.5, changeFrequency: "weekly" },
];

function entryForRecord(
  record: DiscoverableRecord,
  path: string,
  spec: Pick<CollectionSpec, "priority" | "changeFrequency">,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: recordLastModified(record),
    changeFrequency: spec.changeFrequency,
    priority: spec.priority,
  };
}

async function collectionEntries(spec: CollectionSpec): Promise<MetadataRoute.Sitemap> {
  if (!adminDb) return [];
  try {
    const snapshot = await adminDb.collection(spec.name).get();
    return snapshot.docs.flatMap((doc) => {
      const record = { id: doc.id, ...doc.data() } as DiscoverableRecord;
      const indexable = spec.name === "organizations"
        ? isIndexableOrganization(record, (candidate) => isOrganizationPubliclyVisible(
            candidate as Parameters<typeof isOrganizationPubliclyVisible>[0],
          ))
        : isIndexableRecord(record);
      if (!indexable) return [];
      const slug = safePublicSlug(record);
      const path = spec.name === "organizations"
        ? organizationPublicPath(record)
        : slug && spec.prefix ? `${spec.prefix}/${slug}` : null;
      return path ? [entryForRecord(record, path, spec)] : [];
    });
  } catch (error) {
    console.error(`Sitemap: failed to read ${spec.name}:`, error);
    return [];
  }
}

async function postEntries(): Promise<MetadataRoute.Sitemap> {
  if (!adminDb) return [];
  try {
    const snapshot = await adminDb.collection("posts").get();
    return snapshot.docs.flatMap((doc) => {
      const record = { id: doc.id, ...doc.data() } as DiscoverableRecord;
      if (!isIndexableRecord(record)) return [];
      const path = publicPostPath(record);
      if (!path) return [];
      const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
      const isDaily = type === "job" || type === "conference" || type === "event";
      return [entryForRecord(record, path, {
        priority: type === "job" ? 0.8 : 0.6,
        changeFrequency: isDaily ? "daily" : "weekly",
      })];
    });
  } catch (error) {
    console.error("Sitemap: failed to read posts:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" || path === "/events" ? 0.9 : 0.7,
  }));
  const [collections, posts] = await Promise.all([
    Promise.all(COLLECTIONS.map(collectionEntries)),
    postEntries(),
  ]);
  return dedupeSitemap([...staticEntries, ...collections.flat(), ...posts]);
}
