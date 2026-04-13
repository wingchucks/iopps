type UnknownRecord = Record<string, unknown>;

const BLOCKED_USER_STATUSES = new Set(["suspended", "deleted", "disabled"]);
const BLOCKED_ORGANIZATION_STATUSES = new Set(["disabled", "deleted", "archived"]);
const HIDDEN_CONTENT_STATUSES = new Set([
  "archived",
  "cancelled",
  "canceled",
  "closed",
  "completed",
  "deleted",
  "draft",
  "expired",
  "inactive",
  "removed",
  "suspended",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function recordFrom(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

export function normalizeAccessStatus(value: unknown): string {
  return text(value).toLowerCase();
}

export function isHiddenContentStatus(value: unknown): boolean {
  return HIDDEN_CONTENT_STATUSES.has(normalizeAccessStatus(value));
}

export function isPublicPostVisible(value: unknown): boolean {
  const record = recordFrom(value);
  return !isHiddenContentStatus(record.status);
}

export function isPublicScholarshipVisible(value: unknown): boolean {
  const record = recordFrom(value);
  if (record.active === false) return false;
  return !isHiddenContentStatus(record.status);
}

export function getUserAccessBlockReason(
  value: unknown,
  options: { authDisabled?: boolean; authMissing?: boolean } = {},
): string | null {
  const record = recordFrom(value);

  if (options.authMissing) {
    return "This account no longer exists.";
  }

  if (options.authDisabled) {
    return "This account has been disabled.";
  }

  const status = normalizeAccessStatus(record.status);
  if (record.deletedAt != null || status === "deleted") {
    return "This account has been deleted.";
  }

  if (status === "suspended") {
    return "This account is suspended.";
  }

  if (BLOCKED_USER_STATUSES.has(status)) {
    return "This account is not allowed to sign in.";
  }

  return null;
}

export function isUserAccessBlocked(
  value: unknown,
  options: { authDisabled?: boolean; authMissing?: boolean } = {},
): boolean {
  return getUserAccessBlockReason(value, options) !== null;
}

export function getOrganizationAccessBlockReason(value: unknown): string | null {
  const record = recordFrom(value);
  if (record.disabled === true) {
    return "This organization is disabled.";
  }

  if (record.deletedAt != null) {
    return "This organization has been deleted.";
  }

  const status = normalizeAccessStatus(record.status);
  if (BLOCKED_ORGANIZATION_STATUSES.has(status)) {
    return "This organization is no longer active.";
  }

  return null;
}

export function isOrganizationAccessBlocked(value: unknown): boolean {
  return getOrganizationAccessBlockReason(value) !== null;
}
