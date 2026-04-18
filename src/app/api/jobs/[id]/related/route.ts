import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import { isPublicJobVisible } from "@/lib/public-jobs";

export const runtime = "nodejs";
export const revalidate = 300;

type JobRow = Record<string, unknown>;

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
  if (row.salary && typeof row.salary === "object") {
    const sal = row.salary as Record<string, unknown>;
    row.salary = sal.display ? String(sal.display) : "";
  }
  if (!row.employerName) {
    row.employerName =
      (typeof row.orgName === "string" ? row.orgName : "") ||
      (typeof row.companyName === "string" ? row.companyName : "");
  }
  return row;
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

    const found = await findPublicJobDocument(db, id);
    if (!found) {
      return NextResponse.json({ employerJobs: [], similarJobs: [] });
    }

    const currentDoc = await db.collection(found.source).doc(found.id).get();
    if (!currentDoc.exists) {
      return NextResponse.json({ employerJobs: [], similarJobs: [] });
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

    const MAX_EACH = 6;

    // More from this employer — by employerId if present, else by exact name.
    const employerResults: JobRow[] = [];
    if (currentEmployerId) {
      const snap = await db
        .collection("jobs")
        .where("employerId", "==", currentEmployerId)
        .limit(MAX_EACH + 4)
        .get();
      for (const d of snap.docs) {
        if (d.id === currentDoc.id) continue;
        if (!isPublicJobVisible(d.data())) continue;
        employerResults.push(normalizeJob(d));
        if (employerResults.length >= MAX_EACH) break;
      }
    }
    if (employerResults.length === 0 && currentEmployerName) {
      const snap = await db
        .collection("jobs")
        .where("employerName", "==", currentEmployerName)
        .limit(MAX_EACH + 4)
        .get();
      for (const d of snap.docs) {
        if (d.id === currentDoc.id) continue;
        if (!isPublicJobVisible(d.data())) continue;
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
        .limit(MAX_EACH + 10)
        .get();
      for (const d of snap.docs) {
        if (similarSeen.has(d.id)) continue;
        if (!isPublicJobVisible(d.data())) continue;
        similarResults.push(normalizeJob(d));
        similarSeen.add(d.id);
        if (similarResults.length >= MAX_EACH) break;
      }
    }

    if (similarResults.length < MAX_EACH && currentCity) {
      const snap = await db.collection("jobs").limit(80).get();
      for (const d of snap.docs) {
        if (similarSeen.has(d.id)) continue;
        if (!isPublicJobVisible(d.data())) continue;
        const data = d.data();
        if (firstLocationSegment(data.location) !== currentCity) continue;
        similarResults.push(normalizeJob(d));
        similarSeen.add(d.id);
        if (similarResults.length >= MAX_EACH) break;
      }
    }

    return NextResponse.json({
      employerJobs: employerResults,
      similarJobs: similarResults,
    });
  } catch (err) {
    console.error("Related jobs API error:", err);
    return NextResponse.json({ employerJobs: [], similarJobs: [] });
  }
}
