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
