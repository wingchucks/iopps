import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth";
import { getJobById } from "@/lib/firestore/jobs";
import { createApplication } from "@/lib/firestore/applications";

/**
 * POST /api/jobs/:id/apply
 *
 * Authenticated endpoint -- submits a job application for the given job.
 *
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Body (JSON):
 *   resumeUrl?        - URL to the applicant's resume
 *   coverLetter?      - Text cover letter
 *   note?             - Additional notes / interest statement
 *   memberEmail?      - Applicant email (falls back to token email)
 *   memberDisplayName? - Applicant name (falls back to token name)
 *   portfolioUrls?    - Array of portfolio URLs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate
    const authResult = await verifyIdToken(request);
    if (!authResult.success) return authResult.response;

    const { decodedToken } = authResult;
    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Verify the job exists and is active
    const job = await getJobById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    if (!job.active) {
      return NextResponse.json(
        { error: "This job is no longer accepting applications" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;

    const resumeUrl = typeof body.resumeUrl === "string" ? body.resumeUrl : undefined;
    const coverLetter = typeof body.coverLetter === "string" ? body.coverLetter : undefined;
    const note = typeof body.note === "string" ? body.note : undefined;
    const memberEmail =
      typeof body.memberEmail === "string"
        ? body.memberEmail
        : decodedToken.email ?? undefined;
    const memberDisplayName =
      typeof body.memberDisplayName === "string"
        ? body.memberDisplayName
        : decodedToken.name ?? undefined;
    const portfolioUrls =
      Array.isArray(body.portfolioUrls) &&
      body.portfolioUrls.every((u: unknown) => typeof u === "string")
        ? (body.portfolioUrls as string[])
        : undefined;

    // At least a cover letter or resume should be provided
    if (!resumeUrl && !coverLetter) {
      return NextResponse.json(
        { error: "Please provide a resume URL or cover letter" },
        { status: 400 },
      );
    }

    const applicationId = await createApplication({
      jobId,
      employerId: job.employerId,
      memberId: decodedToken.uid,
      memberEmail,
      memberDisplayName,
      resumeUrl,
      coverLetter,
      note,
      coverLetterType: coverLetter ? "text" : undefined,
      coverLetterContent: coverLetter,
      portfolioUrls,
    });

    return NextResponse.json(
      { id: applicationId, message: "Application submitted successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/jobs/:id/apply] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
