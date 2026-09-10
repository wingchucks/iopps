import { NextRequest, NextResponse } from "next/server";
import { activateAdminJob } from "@/lib/server/admin-job-lifecycle";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

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

    let query = adminDb
      .collection("jobs")
      .orderBy("createdAt", "desc")
      .limit(100);

    if (status) {
      if (status !== "active" && status !== "inactive") {
        return NextResponse.json(
          { error: "Invalid status filter. Must be: active or inactive" },
          { status: 400 }
        );
      }

      const isActive = status === "active";

      query = adminDb
        .collection("jobs")
        .where("active", "==", isActive)
        .orderBy("createdAt", "desc")
        .limit(100);
    }

    const snapshot = await query.get();
    const jobs = snapshot.docs.filter(doc => doc.data().status !== 'deleted' && !doc.data().deletedAt).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ jobs });
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
