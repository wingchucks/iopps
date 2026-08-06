import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendAdminApplicationNotification, sendApplicationNotification } from "@/lib/email";
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

type EmployerNotificationTarget = {
  id: string;
  email: string;
  name: string;
  recipientUserIds: string[];
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
  inAppNotificationUserIds?: string[];
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

    if (opts.inAppNotificationUserIds?.length) {
      patch["delivery.employerInAppNotificationUserIds"] = opts.inAppNotificationUserIds;
      patch["delivery.employerInAppNotificationSentAt"] = Timestamp.now();
    }

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

async function getRecipientUserIds(targetIds: string[], employerData: Record<string, unknown>): Promise<string[]> {
  if (!adminDb) return [];

  const recipients = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) recipients.add(value.trim());
  };

  add(employerData.userId);
  add(employerData.uid);
  add(employerData.ownerId);
  add(employerData.ownerUid);

  const teamMemberIds = employerData.teamMemberIds;
  if (Array.isArray(teamMemberIds)) teamMemberIds.forEach(add);

  for (const targetId of targetIds) {
    add(targetId);

    const memberById = await adminDb.collection("members").doc(targetId).get();
    if (memberById.exists) {
      add(memberById.id);
      add(memberById.data()?.uid);
    }

    const membersByOrg = await adminDb
      .collection("members")
      .where("orgId", "==", targetId)
      .limit(25)
      .get();
    membersByOrg.docs.forEach((doc) => {
      add(doc.id);
      add(doc.data().uid);
    });

    const membersByEmployer = await adminDb
      .collection("members")
      .where("employerId", "==", targetId)
      .limit(25)
      .get();
    membersByEmployer.docs.forEach((doc) => {
      add(doc.id);
      add(doc.data().uid);
    });
  }

  return Array.from(recipients);
}

async function resolveEmployerTarget(orgId: string, employerId: string): Promise<EmployerNotificationTarget | null> {
  if (!adminDb) return null;

  const candidates = Array.from(
    new Set([employerId, orgId, resolveEmployerNotificationTargetId({ orgId, employerId }) || ""].filter(Boolean))
  );

  for (const id of candidates) {
    const employerDoc = await adminDb.collection("employers").doc(id).get();
    if (!employerDoc.exists) continue;

    const employerData = employerDoc.data()!;
    const email = normalizeBodyString(employerData.contactEmail || employerData.email);
    const name =
      normalizeBodyString(employerData.name) ||
      normalizeBodyString(employerData.organizationName) ||
      normalizeBodyString(employerData.companyName) ||
      "your organization";

    return {
      id,
      email,
      name,
      recipientUserIds: await getRecipientUserIds(candidates, employerData),
    };
  }

  for (const id of candidates) {
    const orgDoc = await adminDb.collection("organizations").doc(id).get();
    if (!orgDoc.exists) continue;

    const orgData = orgDoc.data()!;
    const email = normalizeBodyString(orgData.contactEmail || orgData.email);
    const name =
      normalizeBodyString(orgData.name) ||
      normalizeBodyString(orgData.organizationName) ||
      normalizeBodyString(orgData.companyName) ||
      "your organization";

    return {
      id,
      email,
      name,
      recipientUserIds: await getRecipientUserIds(candidates, orgData),
    };
  }

  return null;
}

async function createEmployerInAppNotifications(opts: {
  recipientUserIds: string[];
  applicantName: string;
  jobTitle: string;
  postId: string;
}): Promise<string[]> {
  if (!adminDb || opts.recipientUserIds.length === 0) return [];

  const uniqueRecipients = Array.from(new Set(opts.recipientUserIds.filter(Boolean)));
  const createdAt = Timestamp.now();
  const batch = adminDb.batch();

  uniqueRecipients.forEach((userId) => {
    const ref = adminDb!.collection("notifications").doc();
    batch.set(ref, {
      userId,
      type: "application_update",
      title: "New job application received",
      body: `${opts.applicantName} applied for ${opts.jobTitle || "a position"}.`,
      link: "/org/dashboard/applications",
      read: false,
      createdAt,
      metadata: {
        postId: opts.postId,
        source: "job_application",
      },
    });
  });

  await batch.commit();
  return uniqueRecipients;
}

/**
 * POST /api/applications/notify
 * Sends email and in-app notifications to employer when someone applies.
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
      await writeDeliveryStatus({ uid: applicantUid, postId, status: "bad_request", error });
      return NextResponse.json({ sent: false, reason: "bad_request", error });
    }

    const targetOrgId = resolveEmployerNotificationTargetId({ orgId, employerId });
    if (!targetOrgId) {
      const error = "Missing orgId and employerId";
      warnNotification("no_org_id", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({ uid: applicantUid, postId, status: "no_org_id", error });
      return NextResponse.json({ sent: false, reason: "no_org_id", error });
    }

    // Prefer the canonical employerId when available, then fall back to orgId/organization records.
    // Some older jobs carry a public slug in orgId and the real employer account id in employerId.
    const employerTarget = await resolveEmployerTarget(orgId, employerId);
    if (!employerTarget) {
      const error = `Employer document not found for ${targetOrgId}`;
      warnNotification("no_employer_doc", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({ uid: applicantUid, postId, status: "no_employer_doc", error });
      return NextResponse.json({ sent: false, reason: "no_employer_doc", error });
    }

    const inAppNotificationUserIds = await createEmployerInAppNotifications({
      recipientUserIds: employerTarget.recipientUserIds,
      applicantName,
      jobTitle: postTitle || "a position",
      postId,
    });

    if (!employerTarget.email) {
      const error = `Employer ${employerTarget.id} has no contactEmail or email`;
      warnNotification("no_employer_email", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "no_employer_email",
        error,
        inAppNotificationUserIds,
      });
      return NextResponse.json({
        sent: false,
        reason: "no_employer_email",
        error,
        notifiedUsers: inAppNotificationUserIds.length,
      });
    }

    const result = await sendApplicationNotification({
      employerEmail: employerTarget.email,
      employerName: employerTarget.name,
      applicantName,
      jobTitle: postTitle || "a position",
      jobId: postId,
      orgId: employerTarget.id,
    });

    sendAdminApplicationNotification({
      applicantName,
      jobTitle: postTitle || "a position",
      employerName: String(employerName),
      employerEmail,
      jobId: postId,
      orgId: targetOrgId,
    }).catch((error) => {
      console.error("[applications/notify] Admin application email failed:", error);
    });

    if (!result.success) {
      const error = result.error || "Unknown email provider error";
      warnNotification("provider_error", { postId, orgId, employerId, uid: applicantUid }, error);
      await writeDeliveryStatus({
        uid: applicantUid,
        postId,
        status: "provider_error",
        error,
        employerEmailTarget: employerTarget.email,
        inAppNotificationUserIds,
      });
      return NextResponse.json({
        sent: false,
        reason: "provider_error",
        error,
        notifiedUsers: inAppNotificationUserIds.length,
      });
    }

    await writeDeliveryStatus({
      uid: applicantUid,
      postId,
      status: "sent",
      employerEmailTarget: employerTarget.email,
      markSent: true,
      inAppNotificationUserIds,
    });

    return NextResponse.json({ sent: true, notifiedUsers: inAppNotificationUserIds.length });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const status: EmployerNotificationStatus = postId ? "provider_error" : "bad_request";
    warnNotification(status, { postId, orgId, employerId, uid: applicantUid }, error);
    await writeDeliveryStatus({ uid: applicantUid, postId, status, error });
    return NextResponse.json({ sent: false, reason: status, error });
  }
}
