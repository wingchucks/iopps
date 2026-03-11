import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";

export const runtime = "nodejs";

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
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

async function findJobDocument(
  db: FirebaseFirestore.Firestore,
  idOrSlug: string
): Promise<{ docRef: FirebaseFirestore.DocumentSnapshot; source: "jobs" | "posts" } | null> {
  const jobsDoc = await db.collection("jobs").doc(idOrSlug).get();
  if (jobsDoc.exists) return { docRef: jobsDoc, source: "jobs" };

  const jobsBySlug = await db.collection("jobs").where("slug", "==", idOrSlug).limit(1).get();
  if (!jobsBySlug.empty) {
    return { docRef: jobsBySlug.docs[0], source: "jobs" };
  }

  const postsDoc = await db.collection("posts").doc(idOrSlug).get();
  if (postsDoc.exists) return { docRef: postsDoc, source: "posts" };

  const postsBySlug = await db.collection("posts").where("slug", "==", idOrSlug).limit(1).get();
  if (!postsBySlug.empty) {
    return { docRef: postsBySlug.docs[0], source: "posts" };
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    const found = await findJobDocument(db, id);
    if (!found) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { docRef, source } = found;
    const data = docRef.data()!;

    if (source === "jobs") {
      const hydratedPatch = await fetchImportedDescriptionPatch({
        description: typeof data.description === "string" ? data.description : "",
        externalUrl: typeof data.externalUrl === "string" ? data.externalUrl : "",
        externalId: typeof data.externalId === "string" ? data.externalId : "",
        location: typeof data.location === "string" ? data.location : "",
        jobType: typeof data.jobType === "string" ? data.jobType : "",
        department: typeof data.department === "string" ? data.department : "",
      });

      if (hydratedPatch) {
        const firestorePatch: Record<string, unknown> = { ...hydratedPatch };
        await docRef.ref.update(firestorePatch);
        Object.assign(data, firestorePatch);
      }
    }

    const job = serialize({ id: docRef.id, ...data, _source: source }) as Record<string, unknown>;

    // Normalize salary object to string
    if (job.salary && typeof job.salary === "object") {
      const salObj = job.salary as Record<string, unknown>;
      job.salary = salObj.display ? String(salObj.display) : "";
    }

    // Normalize employer name
    if (!job.employerName) {
      job.employerName = job.orgName || job.companyName || "";
    }
    if (typeof job.description === "string") {
      job.description = normalizeImportedDescription(job.description);
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error("Job detail API error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}
