import { NextRequest, NextResponse } from "next/server";
import { activateAdminJob } from "@/lib/server/admin-job-lifecycle";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";
import { isPublicJobRecordVisible } from "@/lib/public-job-merge";

import { adminJobPage, recordedAmount } from "@/lib/admin/reporting";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatusFilter = "active" | "inactive";
type JobAction = "activate" | "deactivate" | "delete";

interface UpdateJobBody {
  jobId: string;
  action: JobAction;
}

const VALID_ACTIONS: ReadonlySet<string> = new Set([
  "activate",
  "deactivate",
  "delete",
]);

// ---------------------------------------------------------------------------
// GET /api/admin/jobs
// ---------------------------------------------------------------------------

/**
 * List jobs with optional status filter.
 *
 * Query params:
 *   status - "active" | "inactive" (optional)
 *            Maps to the `active` boolean field on job documents.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as JobStatusFilter | null;

    if (status && status !== "active" && status !== "inactive") {
      return NextResponse.json({ error: "Invalid status filter. Must be: active or inactive" }, { status: 400 });
    }
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "page must be a positive integer and limit must be 1–100" }, { status: 400 });
    }
    // Legacy records mix ISO strings, Firestore timestamps and missing dates.
    // Read the current admin inventory before filtering/counting and paging;
    // orderBy would silently omit undated records and truncate the total.
    const snapshot = await adminDb.collection("jobs").get();
    const result = adminJobPage(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })), status, page, limit);
    return NextResponse.json({
      ...result,
      jobs: result.jobs.map(record => ({
        ...record,
        recordStatus: record.status,
        applications: recordedAmount(record.applicationCount ?? record.applications),
        status: record.active === true ? "active" : record.active === false ? "inactive" : "unknown",
        publiclyVisible: isPublicJobRecordVisible(record),
      })),
      scope: "Non-deleted job records matching the status filter across all pages; active means the stored enabled flag, not public visibility.",
    });
  } catch (error) {
    console.error("[GET /api/admin/jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/jobs
// ---------------------------------------------------------------------------

/**
 * Update a job's status or delete it.
 *
 * Body:
 *   jobId  - the document ID of the job
 *   action - "activate" | "deactivate" | "delete"
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as UpdateJobBody;

    if (!body.jobId || typeof body.jobId !== "string") {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    if (!body.action || !VALID_ACTIONS.has(body.action)) {
      return NextResponse.json(
        { error: "action must be one of: activate, deactivate, delete" },
        { status: 400 }
      );
    }

    const db = adminDb;
    const jobRef = db.collection("jobs").doc(body.jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    switch (body.action) {
      case "activate": {
        const error = await activateAdminJob(adminDb, body.jobId);
        if (error) return NextResponse.json({ error }, { status: 400 });
        break;
      }

      case "deactivate":
        await db.runTransaction(async transaction => {
          const mirrorRef = db.collection('posts').doc(body.jobId);
          const [current, mirror] = await Promise.all([transaction.get(jobRef),transaction.get(mirrorRef)]);
          if (!current.exists) throw new Error('Job no longer exists');
          if (current.data()?.status === 'deleted' || current.data()?.deletedAt) return;
          const patch = {active:false,status:'closed',updatedAt:FieldValue.serverTimestamp()};
          transaction.update(jobRef,patch);
          if (mirror.exists && mirror.data()?.type === 'job') transaction.update(mirrorRef,patch);
        });
        break;

      case "delete":
        await db.runTransaction(async transaction => {
          const mirrorRef = db.collection("posts").doc(body.jobId);
          const [current, mirror] = await Promise.all([transaction.get(jobRef), transaction.get(mirrorRef)]);
          if (!current.exists) throw new Error("Job no longer exists");
          const patch = { active: false, status: "deleted", deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
          transaction.update(jobRef, patch);
          if (mirror.exists && mirror.data()?.type === "job") transaction.update(mirrorRef, patch);
        });
        break;
    }

    return NextResponse.json({
      success: true,
      jobId: body.jobId,
      action: body.action,
    });
  } catch (error) {
    console.error("[POST /api/admin/jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}
