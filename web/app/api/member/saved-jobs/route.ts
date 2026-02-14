import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth";
import {
  getSavedJobs,
  saveJob,
  unsaveJob,
} from "@/lib/firestore/savedJobs";

/**
 * GET /api/member/saved-jobs
 *
 * Authenticated -- returns the member's saved jobs with attached job data.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request);
    if (!authResult.success) return authResult.response;

    const { uid } = authResult.decodedToken;
    const savedJobs = await getSavedJobs(uid);

    return NextResponse.json({ savedJobs });
  } catch (error) {
    console.error("[GET /api/member/saved-jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved jobs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/member/saved-jobs
 *
 * Authenticated -- saves a job for the member.
 *
 * Body (JSON): { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request);
    if (!authResult.success) return authResult.response;

    const { uid } = authResult.decodedToken;
    const body = (await request.json()) as Record<string, unknown>;

    const jobId = typeof body.jobId === "string" ? body.jobId : null;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 },
      );
    }

    await saveJob(uid, jobId);

    return NextResponse.json(
      { message: "Job saved successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/member/saved-jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/member/saved-jobs
 *
 * Authenticated -- removes a saved job for the member.
 *
 * Body (JSON): { jobId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request);
    if (!authResult.success) return authResult.response;

    const { uid } = authResult.decodedToken;
    const body = (await request.json()) as Record<string, unknown>;

    const jobId = typeof body.jobId === "string" ? body.jobId : null;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 },
      );
    }

    await unsaveJob(uid, jobId);

    return NextResponse.json({ message: "Job unsaved successfully" });
  } catch (error) {
    console.error("[DELETE /api/member/saved-jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to unsave job" },
      { status: 500 },
    );
  }
}
