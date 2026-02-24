import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60; // Cache for 60 seconds

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

function normalizeJob(doc: FirebaseFirestore.QueryDocumentSnapshot, source: "jobs" | "posts"): Record<string, unknown> {
  const data = doc.data();
  const serialized = serialize({ id: doc.id, ...data }) as Record<string, unknown>;
  // Normalize salary object to string
  if (serialized.salary && typeof serialized.salary === "object") {
    const salObj = serialized.salary as Record<string, unknown>;
    serialized.salary = salObj.display ? String(salObj.display) : "";
  }
  // Normalize employer name fields
  if (!serialized.employerName) {
    serialized.employerName = serialized.orgName || serialized.companyName || "";
  }
  // Tag source
  serialized._source = source;
  return serialized;
}

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const employerName = searchParams.get("employerName");
    const employerId = searchParams.get("employerId");

    // Query 1: jobs collection (imported/synced jobs)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jobsQuery: any = db.collection("jobs").where("active", "==", true);
    if (employerId) jobsQuery = jobsQuery.where("employerId", "==", employerId);
    if (employerName) jobsQuery = jobsQuery.where("employerName", "==", employerName);

    // Query 2: posts collection (employer-posted jobs from dashboard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let postsQuery: any = db.collection("posts").where("type", "==", "job").where("status", "==", "active");
    if (employerId) postsQuery = postsQuery.where("orgId", "==", employerId);
    if (employerName) postsQuery = postsQuery.where("orgName", "==", employerName);

    const [jobsSnap, postsSnap] = await Promise.all([jobsQuery.get(), postsQuery.get()]);

    const jobIds = new Set<string>();
    const jobs: Record<string, unknown>[] = [];

    jobsSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      jobIds.add(doc.id);
      jobs.push(normalizeJob(doc, "jobs"));
    });

    // Merge posts — skip if same slug already in jobs collection
    postsSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const slug = doc.data().slug || doc.id;
      if (!jobIds.has(doc.id) && !jobIds.has(slug)) {
        jobs.push(normalizeJob(doc, "posts"));
      }
    });

    // Sort: featured first, then by createdAt desc
    jobs.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err) {
    console.error("Jobs API error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
