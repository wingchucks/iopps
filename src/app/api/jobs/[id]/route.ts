import { updateImportedJobWithEditorialGuard } from "@/lib/server/job-cleanup-guards";
import { publicContentRecord } from "@/lib/server/public-content-record";
import { NextResponse } from "next/server";
import { isPublicJobRecordVisible } from "@/lib/public-job-merge";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";
import { findJobRecordAnyState, type JobRecordMatch } from "@/lib/server/job-record-lookup";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import { listingClosedOn, listingState } from "@/lib/listing-lifecycle";
import { normalizeJobDiscoveryMetadata } from "@/lib/job-metadata";
import { normalizeApplyUrlFields } from "@/lib/utils";

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
      return closedJobResponse(await findJobRecordAnyState(db, id));
    }

    const docRef = await db.collection(found.source).doc(found.id).get();
    if (!docRef.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { source, routeSlug } = found;
    const data = docRef.data()!;
    if (!isPublicJobRecordVisible(data, new Date())) {
      return closedJobResponse({ id: docRef.id, source, data });
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
        const firestorePatch = await updateImportedJobWithEditorialGuard(db, docRef.ref, { ...hydratedPatch }, normalizeImportedDescription);
        if (!Object.keys(firestorePatch).length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        Object.assign(data, firestorePatch);

        if (!isPublicJobRecordVisible(data, new Date())) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
      }
    }

    return NextResponse.json({ job: publicJobPayload(docRef.id, data, source, routeSlug) }, {headers:{"Cache-Control":"no-store"}});
  } catch (err) {
    console.error("Job detail API error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}

function publicJobPayload(id: string, data: Record<string, unknown>, source: string, routeSlug: string) {
  const job = normalizeApplyUrlFields(
    serialize({ id, ...data, _source: source }) as Record<string, unknown>,
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
    job.description = normalizeImportedDescription(job.description, job.descriptionFormat);
    job.descriptionFormat = "plain-text";
  }
  return publicContentRecord(normalizeJobDiscoveryMetadata(job));
}

/**
 * A closed job keeps its page (marked closed, not indexed, no application);
 * a removed, draft or unknown job stays "not found".
 */
function closedJobResponse(match: JobRecordMatch | null) {
  const now = new Date();
  if (!match || listingState(match.data, now) !== "closed") {
    return NextResponse.json({ error: "Job not found", unavailable: Boolean(match) }, { status: 404 });
  }
  const routeSlug = buildJobRouteSlug({ id: match.id, slug: typeof match.data.slug === "string" ? match.data.slug : undefined, title: typeof match.data.title === "string" ? match.data.title : undefined });
  return NextResponse.json(
    { job: publicJobPayload(match.id, match.data, match.source, routeSlug), closed: { closedOn: listingClosedOn(match.data, now) } },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
