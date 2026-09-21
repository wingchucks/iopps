import { publicContentRecord } from "@/lib/server/public-content-record";
import { projectPublicJobDiscovery } from "@/lib/server/public-job-discovery-projection";
import { NextResponse } from "next/server";
import { normalizeJobDiscoveryMetadata } from "@/lib/job-metadata";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeImportedDescription } from "@/lib/server/imported-job-descriptions";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import {
  buildPublicJobRouteSlugMap,
  sortJobsByRecency,
} from "@/lib/public-jobs";
import { mergePublicJobRecords } from "@/lib/public-job-merge";
import { loadPublicJobDocuments } from "@/lib/server/public-job-documents";

export const runtime = "nodejs";
export const revalidate = 0; // Evaluate public eligibility on every read.

const PUBLIC_LIST_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

type NormalizedJob = Record<string, unknown> & {
  id: string;
  slug?: string;
  active?: boolean;
  status?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  postedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  order?: number | null;
};

// Recursively convert Firestore Timestamps and non-serializable values to JSON-safe types
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Firestore Timestamp (has toDate method)
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  // Plain objects
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }

  // Primitives (string, number, boolean)
  return value;
}

function normalizeJob(doc: FirebaseFirestore.DocumentSnapshot, source: "jobs" | "posts"): NormalizedJob {
  const data = doc.data()!;
  const serialized = serialize({ id: doc.id, ...data }) as Record<string, unknown>;
  serialized.slug = buildJobRouteSlug({
    id: doc.id,
    slug: typeof serialized.slug === "string" ? serialized.slug : undefined,
    title: typeof serialized.title === "string" ? serialized.title : undefined,
  });

  // Normalize employer name fields
  if (!serialized.employerName) {
    serialized.employerName = serialized.orgName || serialized.companyName || "";
  }
  if (typeof serialized.description === "string") {
    serialized.description = normalizeImportedDescription(serialized.description, serialized.descriptionFormat);
    serialized.descriptionFormat = "plain-text";
  }
  // Tag source
  serialized._source = source;
  if (source === "jobs") serialized.active = data.active === true;
  return serialized as NormalizedJob;
}

function normalizeJobDisplay(job: NormalizedJob): NormalizedJob {
  // Keep structured identity evidence through BOTH merge and discovery selection.
  // Only the selected public representatives may lose it for display.
  const salary = job.salary;
  const display = {
    ...job,
    salary: salary && typeof salary === "object"
      ? "display" in salary && salary.display ? String(salary.display) : ""
      : salary,
  };
  return normalizeJobDiscoveryMetadata(display);
}

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const employerName = searchParams.get("employerName");
    const employerId = searchParams.get("employerId");

    const { jobs, posts } = await loadPublicJobDocuments(db);

    const publicJobs = mergePublicJobRecords<NormalizedJob, NormalizedJob>(
      jobs.map(doc => normalizeJob(doc, "jobs")),
      posts.map(doc => normalizeJob(doc, "posts")),
    );

    const publicSlugMap = buildPublicJobRouteSlugMap(publicJobs.map((job) => ({
      id: String(job.id),
      slug: typeof job.slug === "string" ? job.slug : undefined,
      title: typeof job.title === "string" ? job.title : undefined,
    })));

    publicJobs.forEach((job) => {
      job.slug = publicSlugMap.get(String(job.id)) || String(job.slug || job.id);
    });

    const sortedJobs = sortJobsByRecency(projectPublicJobDiscovery(publicJobs.filter(job =>
      (!employerId || job.employerId === employerId || job.orgId === employerId) &&
      (!employerName || job.employerName === employerName || job.orgName === employerName)
    )).map(normalizeJobDisplay));

    return NextResponse.json(
      { jobs: sortedJobs.map(publicContentRecord), count: sortedJobs.length },
      { headers: PUBLIC_LIST_CACHE_HEADERS },
    );
  } catch (err) {
    console.error("Jobs API error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
