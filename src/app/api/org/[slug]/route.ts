import { NextResponse } from "next/server";
import { toPublicOrganization } from "@/lib/public-organization";
import { getAdminDb, hasAdminRuntimeSupport } from "@/lib/firebase-admin";
import { getLocalDevOrganizationPayload } from "@/lib/local-dev-business-data";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import { resolvePublicOrganization } from "@/lib/server/public-organization-resolver";
import { loadPublicOrganizationJobDocuments } from "@/lib/server/public-organization-jobs";
import { mergeOpportunitySources, publicOpportunityRecord } from "@/lib/server/public-opportunities";
import { mergePublicJobRecords, jobMatchesOrganization } from "@/lib/public-job-merge";
import { withPartnerPromotion } from "@/lib/server/partner-promotion";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization, isSchoolPubliclyVisible } from "@/lib/school-visibility";

import { requireEmployerContext } from "@/lib/server/employer-auth";
import { getOrganizationAccessBlockReason } from "@/lib/access-state";
import { getBusinessListingReview } from "@/lib/business-listing-review";

function profileResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return (
      (value as Record<string, unknown>).toDate as () => Date
    )().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function matchesOrgName(value: unknown, orgName: string): boolean {
  const candidate = normalizeText(value);
  const target = normalizeText(orgName);
  if (!candidate || !target) return false;
  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

function parseMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function dedupeByHref<T extends JsonRecord>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.href || item.slug || item.id || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortFeatured(items: JsonRecord[]): JsonRecord[] {
  return [...items].sort((left, right) => {
    if (left.featured && !right.featured) return -1;
    if (!left.featured && right.featured) return 1;
    return parseMillis(right.createdAt) - parseMillis(left.createdAt);
  });
}

function sortRecent(items: JsonRecord[]): JsonRecord[] {
  return [...items].sort((left, right) => {
    const rightTime =
      parseMillis(right.date) ||
      parseMillis(right.dates) ||
      parseMillis(right.startDate) ||
      parseMillis(right.createdAt);
    const leftTime =
      parseMillis(left.date) ||
      parseMillis(left.dates) ||
      parseMillis(left.startDate) ||
      parseMillis(left.createdAt);
    return rightTime - leftTime;
  });
}

function serializeDoc(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot,
): JsonRecord {
  return serialize({ id: doc.id, ...(doc.data() || {}) }) as JsonRecord;
}

function normalizeJob(doc: FirebaseFirestore.DocumentSnapshot, source: "jobs" | "posts"): JsonRecord {
  const serialized = serializeDoc(doc);
  if (serialized.salary && typeof serialized.salary === "object") {
    const salary = serialized.salary as JsonRecord;
    serialized.salary = salary.display ? String(salary.display) : "";
  }
  if (!serialized.employerName) {
    serialized.employerName = serialized.orgName || serialized.companyName || "";
  }
  serialized._source = source;
  if (source === "jobs") serialized.active = doc.data()?.active === true;
  return serialized;
}

function normalizeEvent(item: JsonRecord): JsonRecord {
  return {
    ...item,
    href: `/events/${String(item.slug || item.id)}`,
  };
}

function normalizeScholarship(item: JsonRecord): JsonRecord {
  return {
    ...item,
    href: `/scholarships/${String(item.slug || item.id)}`,
  };
}

async function loadJobs(db: FirebaseFirestore.Firestore, organization: JsonRecord): Promise<JsonRecord[]> {
  const { jobs, posts } = await loadPublicOrganizationJobDocuments(db, organization);
  const publicJobs = mergePublicJobRecords(
    jobs.map(doc => ({ ...normalizeJob(doc, "jobs"), id: doc.id } as JsonRecord & { id: string })),
    posts.map(doc => ({ ...normalizeJob(doc, "posts"), id: doc.id } as JsonRecord & { id: string })),
  );
  return sortFeatured(publicJobs.filter(job => jobMatchesOrganization(job, organization)).map(job => {
    const slug = buildJobRouteSlug({ id: job.id, slug: typeof job.slug === "string" ? job.slug : undefined, title: typeof job.title === "string" ? job.title : undefined });
    // Scoped results cannot detect another organization's matching display slug.
    return { ...job, href: `/jobs/${slug}--${job.id}` };
  }));
}

async function loadEvents(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [eventsByEmployerSnap, eventsByOrgSnap, postsByOrgSnap] = await Promise.all([
    db.collection("events").where("employerId", "==", orgId).get(),
    db.collection("events").where("orgId", "==", orgId).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const exactMatches = mergeOpportunitySources(
    [...eventsByEmployerSnap.docs, ...eventsByOrgSnap.docs].map(serializeDoc),
    postsByOrgSnap.docs.filter(doc => doc.data().type === "event").map(serializeDoc),
    "events",
  ).map(record => publicOpportunityRecord(record, "events"))
    .filter((record): record is JsonRecord => record !== null)
    .map(normalizeEvent);

  if (exactMatches.length > 0) {
    return sortRecent(dedupeByHref(exactMatches));
  }

  const allEventsSnap = await db.collection("events").limit(500).get();
  const fallbackMatches = allEventsSnap.docs
    .map((doc) => serializeDoc(doc))
    .filter((item) =>
      matchesOrgName(item.organizerName, orgName) ||
      matchesOrgName(item.orgName, orgName) ||
      matchesOrgName(item.organizer, orgName),
    )
    .map(record => publicOpportunityRecord(record, "events"))
    .filter((record): record is JsonRecord => record !== null)
    .map(normalizeEvent);

  return sortRecent(dedupeByHref(fallbackMatches));
}

async function loadScholarships(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [scholarshipsByEmployerSnap, scholarshipsByOrgSnap, postsByOrgSnap] = await Promise.all([
    db.collection("scholarships").where("employerId", "==", orgId).get(),
    db.collection("scholarships").where("orgId", "==", orgId).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const exactMatches = mergeOpportunitySources(
    [...scholarshipsByEmployerSnap.docs, ...scholarshipsByOrgSnap.docs].map(serializeDoc),
    postsByOrgSnap.docs.filter(doc => doc.data().type === "scholarship").map(serializeDoc),
    "scholarships",
  ).map(record => publicOpportunityRecord(record, "scholarships"))
    .filter((record): record is JsonRecord => record !== null)
    .map(normalizeScholarship);

  if (exactMatches.length > 0) {
    return sortRecent(dedupeByHref(exactMatches));
  }

  const allScholarshipsSnap = await db.collection("scholarships").limit(500).get();
  const fallbackMatches = allScholarshipsSnap.docs
    .map((doc) => serializeDoc(doc))
    .filter((item) =>
      matchesOrgName(item.organization, orgName) ||
      matchesOrgName(item.orgName, orgName),
    )
    .map(record => publicOpportunityRecord(record, "scholarships"))
    .filter((record): record is JsonRecord => record !== null)
    .map(normalizeScholarship);

  return sortRecent(dedupeByHref(fallbackMatches));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (process.env.NODE_ENV !== "production" && !hasAdminRuntimeSupport()) {
    const payload = getLocalDevOrganizationPayload(slug);
    if (payload) {
      return profileResponse({
        ...payload,
        training: [],
        programs: [],
      });
    }

    return profileResponse({ error: "Organization not found" }, { status: 404 });
  }

  try {
    const db = getAdminDb();
    const orgRecord = await resolvePublicOrganization(db, slug);

    if (!orgRecord) {
      return profileResponse({ error: "Organization not found" }, { status: 404 });
    }

    let ownerPreview = false;
    if (getOrganizationAccessBlockReason(orgRecord) || String(orgRecord.status).trim().toLowerCase() === "suspended") return profileResponse({ error: "Organization not found" }, { status: 404 });
    if (isSchoolOrganization(orgRecord)) {
      if (!isSchoolPubliclyVisible(orgRecord)) {
        return profileResponse({ error: "Organization not found" }, { status: 404 });
      }
    } else if (!isOrganizationPubliclyVisible(orgRecord)) {
      try {
        const context = await requireEmployerContext(req);
        ownerPreview = context.orgRole === "owner" && context.orgId === orgRecord.id;
      } catch { /* Nonpublic records remain indistinguishable from missing records. */ }
      if (!ownerPreview) return profileResponse({ error: "Organization not found" }, { status: 404 });
    }

    const org = normalizeOrganizationRecord(withPartnerPromotion(orgRecord));

    const orgId = String(org.id || "");
    const orgName = String(org.name || "");

    const [jobs, events, scholarships] = await Promise.all([
      loadJobs(db, org),
      loadEvents(db, orgId, orgName),
      loadScholarships(db, orgId, orgName),
    ]);

    return profileResponse({
      org: toPublicOrganization(org),
      ...(ownerPreview ? { ownerPreview: true, reviewStatus: getBusinessListingReview(org)?.status || "hidden" } : {}),
      jobs,
      events,
      scholarships,
      // Training is paused; retain the response fields without advertising retired links.
      training: [],
      programs: [],
    });
  } catch (err) {
    console.error("[api/org] Error:", err);
    return profileResponse({ error: "Failed to load organization" }, { status: 500 });
  }
}
