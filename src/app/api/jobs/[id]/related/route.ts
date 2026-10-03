import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";
import { loadCachedPublicJobRouteIndex } from "@/lib/public-job-route-cache";
import { findJobRecordAnyState } from "@/lib/server/job-record-lookup";
import { listingState } from "@/lib/listing-lifecycle";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import { isPublicJobVisible } from "@/lib/public-jobs";
import { mergePublicJobRecords, publicJobIdentityKey } from "@/lib/public-job-merge";
import { publicContentRecord } from "@/lib/server/public-content-record";
import { withPublicDetailCache } from "@/lib/server/public-detail-cache";

export const runtime = "nodejs";
// No ISR: a closed listing leaves recommendations at once (listing-lifecycle);
// only the short CDN window of withPublicDetailCache applies.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type JobRow = Record<string, unknown> & { id: string };

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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

function normalizeJob(doc: FirebaseFirestore.QueryDocumentSnapshot): JobRow {
  const data = doc.data();
  const row = serialize({ id: doc.id, ...data }) as JobRow;
  row.slug = buildJobRouteSlug({
    id: doc.id,
    slug: typeof row.slug === "string" ? row.slug : undefined,
    title: typeof row.title === "string" ? row.title : undefined,
  });

  if (!row.employerName) {
    row.employerName =
      (typeof row.orgName === "string" ? row.orgName : "") ||
      (typeof row.companyName === "string" ? row.companyName : "");
  }
  return row;
}

// Canonical evidence (especially structured salary) must reach dedupe intact.
// Only the final display projection may discard it; the client renders these
// rows, which carry only the public allow-list (never author, billing or import data).
function relatedDisplayRows(rows: JobRow[]): Record<string, unknown>[] {
  return mergePublicJobRecords(rows, []).map(row => {
    if (!row.salary || typeof row.salary !== "object") return row;
    const salary = row.salary as Record<string, unknown>;
    return { ...row, salary: salary.display ? String(salary.display) : "" };
  }).map(publicContentRecord);
}

// The same eligibility as the public listing and detail: a jobs record is public
// only while active === true and visible.
function isPublicJobRecord(data: FirebaseFirestore.DocumentData): boolean {
  return data.active === true && isPublicJobVisible(data);
}

function firstLocationSegment(value: unknown): string {
  if (typeof value !== "string") return "";
  const parts = value.split(",");
  return (parts[0] || "").trim().toLowerCase();
}

/**
 * M-2 — "More from this employer" + "Similar roles" for the job detail
 * page. Reduces the terminal-page problem: a user who doesn't apply now
 * has a path to more IOPPS jobs instead of leaving the platform.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    let found = await findPublicJobDocument(db, id, loadCachedPublicJobRouteIndex);
    if (!found) {
      // A closed job's page still offers open alternatives.
      const record = await findJobRecordAnyState(db, id);
      if (record && listingState(record.data) === "closed") found = { id: record.id, source: record.source, routeSlug: "" };
    }
    if (!found) {
      return withPublicDetailCache(
        NextResponse.json({ employerJobs: [], similarJobs: [] }),
      );
    }

    const currentDoc = await db.collection(found.source).doc(found.id).get();
    if (!currentDoc.exists) {
      return withPublicDetailCache(
        NextResponse.json({ employerJobs: [], similarJobs: [] }),
      );
    }
    const current = currentDoc.data() || {};
    const currentEmployerId =
      (typeof current.employerId === "string" ? current.employerId : "") ||
      (typeof current.orgId === "string" ? current.orgId : "");
    const currentEmployerName =
      (typeof current.employerName === "string" ? current.employerName : "") ||
      (typeof current.orgName === "string" ? current.orgName : "") ||
      (typeof current.companyName === "string" ? current.companyName : "");
    const currentCategory =
      (typeof current.category === "string" ? current.category : "") ||
      (typeof current.department === "string" ? current.department : "");
    const currentCity = firstLocationSegment(current.location);
    // Another record of the same vacancy (for example a feed re-import) is not a recommendation.
    const currentKey = publicJobIdentityKey({ ...current, id: currentDoc.id });
    const isCopyOfCurrent = (d: FirebaseFirestore.QueryDocumentSnapshot) =>
      !currentKey.startsWith("id:") && publicJobIdentityKey({ ...d.data(), id: d.id }) === currentKey;

    const MAX_EACH = 6;

    // More from this employer — by employerId if present, else by exact name.
    const employerResults: JobRow[] = [];
    if (currentEmployerId) {
      const snap = await db
        .collection("jobs")
        .where("employerId", "==", currentEmployerId)
        .where("active", "==", true)
        .limit(MAX_EACH + 4)
        .get();
      for (const d of snap.docs) {
        if (d.id === currentDoc.id) continue;
        if (isCopyOfCurrent(d)) continue;
        if (!isPublicJobRecord(d.data())) continue;
        employerResults.push(normalizeJob(d));
        if (employerResults.length >= MAX_EACH) break;
      }
    }
    if (employerResults.length === 0 && currentEmployerName) {
      const snap = await db
        .collection("jobs")
        .where("employerName", "==", currentEmployerName)
        .where("active", "==", true)
        .limit(MAX_EACH + 4)
        .get();
      for (const d of snap.docs) {
        if (d.id === currentDoc.id) continue;
        if (isCopyOfCurrent(d)) continue;
        if (!isPublicJobRecord(d.data())) continue;
        employerResults.push(normalizeJob(d));
        if (employerResults.length >= MAX_EACH) break;
      }
    }

    // Similar roles — same category first, then same city, excluding the
    // current job and the employer's own jobs (those are shown above).
    const similarSeen = new Set<string>([
      currentDoc.id,
      ...employerResults.map((j) => String(j.id || "")),
    ]);
    const similarResults: JobRow[] = [];

    if (currentCategory) {
      const snap = await db
        .collection("jobs")
        .where("category", "==", currentCategory)
        .where("active", "==", true)
        .limit(MAX_EACH + 10)
        .get();
      for (const d of snap.docs) {
        if (similarSeen.has(d.id)) continue;
        if (isCopyOfCurrent(d)) continue;
        if (!isPublicJobRecord(d.data())) continue;
        similarResults.push(normalizeJob(d));
        similarSeen.add(d.id);
        if (similarResults.length >= MAX_EACH) break;
      }
    }

    if (similarResults.length < MAX_EACH && currentCity) {
      const snap = await db.collection("jobs").where("active", "==", true).limit(80).get();
      for (const d of snap.docs) {
        if (similarSeen.has(d.id)) continue;
        if (isCopyOfCurrent(d)) continue;
        if (!isPublicJobRecord(d.data())) continue;
        const data = d.data();
        if (firstLocationSegment(data.location) !== currentCity) continue;
        similarResults.push(normalizeJob(d));
        similarSeen.add(d.id);
        if (similarResults.length >= MAX_EACH) break;
      }
    }

    return withPublicDetailCache(
      NextResponse.json({
        employerJobs: relatedDisplayRows(employerResults),
        similarJobs: relatedDisplayRows(similarResults),
      }),
    );
  } catch (err) {
    console.error("Related jobs API error:", err);
    return NextResponse.json({ employerJobs: [], similarJobs: [] });
  }
}
