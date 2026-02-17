import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { id: jobId } = await params;
  const body = await request.json();
  const { decodedToken } = authResult;

  // Verify job exists and is active
  const jobDoc = await adminDb.collection("posts").doc(jobId).get();
  if (!jobDoc.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const job = jobDoc.data()!;
  if (job.status !== "active") return NextResponse.json({ error: "Job not accepting applications" }, { status: 400 });

  // Check for duplicate application
  const existing = await adminDb.collection("applications")
    .where("jobId", "==", jobId)
    .where("applicantUid", "==", decodedToken.uid)
    .limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  // Get user profile
  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const user = userDoc.data();

  const now = FieldValue.serverTimestamp();
  const application = {
    jobId,
    jobTitle: job.title,
    orgId: job.orgId,
    orgName: job.orgName,
    applicantUid: decodedToken.uid,
    applicantName: user?.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    applicantEmail: decodedToken.email || "",
    resumeURL: body.resumeURL || user?.resumeURL || "",
    coverMessage: body.coverMessage || "",
    attachments: body.attachments || [],
    status: "submitted",
    statusHistory: [{ status: "submitted", at: new Date() }],
    createdAt: now,
    updatedAt: now,
  };

  const ref = await adminDb.collection("applications").add(application);

  // Increment application count on the job
  await adminDb.collection("posts").doc(jobId).update({
    applicationCount: FieldValue.increment(1),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
