import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";
import { applyJobDisplayFallbacks } from "@/lib/job-record-utils";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    const found = await findPublicJobDocument(db, id);
    if (!found) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const docRef = await db.collection(found.source).doc(found.id).get();
    if (!docRef.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { source, routeSlug } = found;
    const data = docRef.data()!;

    if (!data.slug && routeSlug && routeSlug !== docRef.id) {
      await docRef.ref.set({ slug: routeSlug }, { merge: true });
      data.slug = routeSlug;
    }

    if (source === "jobs") {
      let feedUrl = "";
      if (typeof data.feedId === "string" && data.feedId) {
        const feedDoc = await db.collection("rssFeeds").doc(data.feedId).get();
        feedUrl = typeof feedDoc.data()?.feedUrl === "string" ? feedDoc.data()!.feedUrl : "";
      }

      const hydratedPatch = await fetchImportedDescriptionPatch({
        description: typeof data.description === "string" ? data.description : "",
        externalUrl: typeof data.externalUrl === "string" ? data.externalUrl : "",
        externalId: typeof data.externalId === "string" ? data.externalId : "",
        location: typeof data.location === "string" ? data.location : "",
        jobType: typeof data.jobType === "string" ? data.jobType : "",
        department: typeof data.department === "string" ? data.department : "",
        feedUrl,
      });

      if (hydratedPatch) {
        const firestorePatch: Record<string, unknown> = { ...hydratedPatch };
        await docRef.ref.update(firestorePatch);
        Object.assign(data, firestorePatch);

        if (hydratedPatch.active === false || hydratedPatch.status === "expired") {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
      }
    }

    const job = applyJobDisplayFallbacks(
      serialize({ id: docRef.id, ...data, _source: source }) as Record<string, unknown>
    );
    job.slug = routeSlug;

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
