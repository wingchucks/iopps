import type { DocumentReference, Firestore } from "firebase-admin/firestore";

/** A short durable lease prevents concurrent retries from sending duplicate email. */
export async function claimApplicationNotification(db: Firestore, ref: DocumentReference, uid: string, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("Application not found");
    const application = snap.data()!;
    if (application.userId !== uid) throw new Error("Application ownership mismatch");
    if (application.delivery?.employerNotificationStatus === "sent" || application.delivery?.employerNotificationSentAt) return {state:"sent" as const, application};
    if (Number(application.delivery?.employerNotificationLeaseUntil || 0) > now) return {state:"busy" as const, application};
    transaction.update(ref, {"delivery.employerNotificationLeaseUntil":now + 120000});
    return {state:"claimed" as const, application};
  });
}

export type EmployerNotificationStatus =
  | "sent"
  | "no_employer_doc"
  | "no_employer_email"
  | "provider_error"
  | "bad_request"
  | "no_org_id";

type DeliveryPatchOptions = {
  attemptedAt: unknown;
  status: EmployerNotificationStatus;
  sentAt?: unknown;
  error?: string;
  employerEmailTarget?: string;
};

type TargetIdOptions = {
  orgId?: string | null;
  employerId?: string | null;
};

function normalizeOptionalString(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildApplicationDeliveryDocId(applicantUid: string, postId: string): string {
  return `${applicantUid}_${postId}`;
}

export function resolveEmployerNotificationTargetId({
  orgId,
  employerId,
}: TargetIdOptions): string | null {
  const normalizedOrgId = normalizeOptionalString(orgId);
  if (normalizedOrgId) return normalizedOrgId;

  const normalizedEmployerId = normalizeOptionalString(employerId);
  if (normalizedEmployerId) return normalizedEmployerId;

  return null;
}

export function buildEmployerNotificationDeliveryPatch({
  attemptedAt,
  status,
  sentAt,
  error,
  employerEmailTarget,
}: DeliveryPatchOptions): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    "delivery.employerNotificationAttemptedAt": attemptedAt,
    "delivery.employerNotificationStatus": status,
  };

  if (sentAt !== undefined) {
    patch["delivery.employerNotificationSentAt"] = sentAt;
  }

  const normalizedError = normalizeOptionalString(error);
  if (normalizedError) {
    patch["delivery.employerNotificationError"] = normalizedError;
  }

  const normalizedEmployerEmailTarget = normalizeOptionalString(employerEmailTarget);
  if (normalizedEmployerEmailTarget) {
    patch["delivery.employerEmailTarget"] = normalizedEmployerEmailTarget;
  }

  return patch;
}

export async function persistEmployerNotificationDelivery(
  applicationRef: Pick<DocumentReference, "update">,
  options: DeliveryPatchOptions,
): Promise<void> {
  // update interprets dotted paths and never recreates a deleted application.
  await applicationRef.update(buildEmployerNotificationDeliveryPatch(options));
}
