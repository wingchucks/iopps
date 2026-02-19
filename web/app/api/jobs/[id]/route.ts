import { NextResponse, type NextRequest } from "next/server";
import { getJobById } from "@/lib/firestore/jobs";

/**
 * GET /api/jobs/:id
 *
 * Public endpoint -- returns a single job posting by document ID.
 * Returns 404 if the job does not exist or is inactive.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const job = await getJobById(id);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    // Only return active jobs through the public API
    if (!job.active) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[GET /api/jobs/:id] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 },
    );
  }
}
