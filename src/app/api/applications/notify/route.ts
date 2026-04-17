import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendApplicationNotification } from "@/lib/email";
import {
  buildApplicationDeliveryDocId,
  buildEmployerNotificationDeliveryPatch,
  resolveEmployerNotificationTargetId,
  type EmployerNotificationStatus,
} from "@/lib/application-notification-delivery";

export const runtime = "nodejs";

type NotifyRequestBody = {
  postId?: unknown;
  postTitle?: unknown;
  orgId?: unknown;
  employerId?: unknown;
  applicantUid?: unknown;
};

type NotifyContext = {
  postId?: string;
  orgId?: string;
  employerId?: string;
  uid?: string;
};

function normalizeBodyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function warnNotification(reason: string, context: NotifyContext, error?: string) {
  console.warn("[applications/notify]", {
    reason,
    postId: context.postId || "",
    orgId: context.orgId || "",
    employerId: context.employerId || "",
    uid: context.uid || "",
    ...(error ? { error } : {}),
  });
}

async function writeDeliveryStatus(opts: {
  uid?: string;
  postId?: string;
  status: EmployerNotificationStatus;
  error?: string;
  employerEmailTarget?: string;
  markSent?: boolean;
}) {
  if (!adminDb) return;

  const uid = normalizeBodyString(opts.uid);
  const postId = normalizeBodyString(opts.postId);
  if (!uid || !postId) {
    console.warn("[applications/notify] Skipping delivery write: missing application key", {
      uid,
      postId,
      status: opts.status,
    });
    return;
  }

  try {
    const applicationId = buildApplicationDeliveryDocId(uid, postId);
    const applicationRef = adminDb.collection("applications").doc(applicationId);
    const applicationSnap = await applicationRef.get();

    if (!applicationSnap.exists) {
      console.warn("[applications/notify] Application document missing, skipping delivery write", {
        applicationId,
        uid,
        postId,
        status: opts.status,
      });
      return;
    }

    const attemptedAt = Timestamp.now();
    const patch = buildEmployerNotificationDeliveryPatch({
      attemptedAt,
      status: opts.status,
      sentAt: opts.markSent ? Timestamp.now() : undefined,
      error: opts.error,
      employerEmailTarget: opts.employerEmailTarget,
    });

    await applicationRef.set(patch, { merge: true });
  } catch (error) {
    console.warn("[applications/notify] Failed to write delivery status", {
      uid,
      postId,
      status: opts.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /api/applications/notify
 * Sends email notification to employer when someone applies.
 * Body: { postId, postTitle, orgId, employerId, applicantUid }
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

  let applicantUid = "";
  let applicantName = "A candidate";
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    applicantUid = decoded.uid;
    applicantName = decoded.name || decoded.email || "A candidate";
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let postId = "";
  let postTitle = "";
  let orgId = "";
  let employerId = "";

  try {
    const body = (await req.json()) as NotifyRequestBody;
    postId = normalizeBodyString(body.postId);
    postTitle = normalizeBodyString(body.postTitle);
    orgId = normalizeBodyString(body.orgId);
    employerId = normalizeBodyString(body.employerId);
    const requestedApplicantUid = normalizeBodyString(body.applicantUid);

    if (requestedApplicantUid && requestedApplicantUid !== applicantUid) {
      warnNotification("applicant_uid_mismatch", { postId, orgId, employerId, uid: applicantUid }, requestedApplicantUid);
    }

    if (!postId) {
      const error = "Missing postId";
      warnNotification("bad_request", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "bad_request",
        error,
      });
      return NextResponse.json({ sent: false, reason: "bad_request", error });
    }

    const targetOrgId = resolveEmployerNotificationTargetId({ orgId, employerId });
    if (!targetOrgId) {
      const error = "Missing orgId and employerId";
      warnNotification("no_org_id", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "no_org_id",
        error,
      });
      return NextResponse.json({ sent: false, reason: "no_org_id", error });
    }

    // Look up employer email from employers collection
    const empDoc = await adminDb.collection("employers").doc(targetOrgId).get();
    if (!empDoc.exists) {
      const error = `Employer document not found for ${targetOrgId}`;
      warnNotification("no_employer_doc", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "no_employer_doc",
        error,
      });
      return NextResponse.json({ sent: false, reason: "no_employer_doc", error });
    }

    const empData = empDoc.data()!;
    const employerEmail = normalizeBodyString(empData.contactEmail || empData.email);
    const employerName = empData.name || "your organization";

    if (!employerEmail) {
      const error = `Employer ${targetOrgId} has no contactEmail or email`;
      warnNotification("no_employer_email", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "no_employer_email",
        error,
      });
      return NextResponse.json({ sent: false, reason: "no_employer_email", error });
    }

    const result = await sendApplicationNotification({
      employerEmail,
      employerName,
      applicantName,
      jobTitle: postTitle || "a position",
      jobId: postId,
      orgId: targetOrgId,
    });

    if (!result.success) {
      const error = result.error || "Unknown email provider error";
      warnNotification("provider_error", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "provider_error",
        error,
        employerEmailTarget: employerEmail,
      });
      return NextResponse.json({ sent: false, reason: "provider_error", error });
    }

    await writeDeliveryStatus({
      uid: applicantUid,
      postId,
      status: "sent",
      employerEmailTarget: employerEmail,
      markSent: true,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const status: EmployerNotificationStatus = postId ? "provider_error" : "bad_request";
    warnNotification(status, { postId, orgId, employerId, uid: applicantUid }, error);
    await writeDeliveryStatus({
      uid: applicantUid,
      postId,
      status,
      error,
    });
    return NextResponse.json({ sent: false, reason: status, error });
  }
}
