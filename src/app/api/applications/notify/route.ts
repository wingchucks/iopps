import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendApplicationNotification } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/applications/notify
 * Sends email notification to employer when someone applies.
 * Body: { postId, postTitle, orgId }
 * Auth: Bearer token required (applicant must be logged in)
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // Verify applicant is logged in
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let applicantName = "A candidate";
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    applicantName = decoded.name || decoded.email || "A candidate";
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const { postId, postTitle, orgId } = await req.json();
    if (!postId || !orgId) {
      return NextResponse.json({ error: "Missing postId or orgId" }, { status: 400 });
    }

    // Look up employer email from employers collection
    const empDoc = await adminDb.collection("employers").doc(orgId).get();
    if (!empDoc.exists) {
      // Not critical — just skip notification
      return NextResponse.json({ sent: false, reason: "Employer not found" });
    }

    const empData = empDoc.data()!;
    const employerEmail = empData.contactEmail || empData.email;
    const employerName = empData.name || "your organization";

    if (!employerEmail) {
      return NextResponse.json({ sent: false, reason: "No employer email" });
    }

    const result = await sendApplicationNotification({
      employerEmail,
      employerName,
      applicantName,
      jobTitle: postTitle || "a position",
      jobId: postId,
      orgId,
    });

    return NextResponse.json({ sent: result.success, error: result.error });
  } catch (err) {
    console.error("[applications/notify] Error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
