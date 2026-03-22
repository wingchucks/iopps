import type { AdminUserRow } from "./view-types";

type UnknownRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function recordFrom(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function toIsoString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  if (typeof value === "object") {
    const record = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof record.toDate === "function") return record.toDate().toISOString();
    if (typeof record.seconds === "number") return new Date(record.seconds * 1000).toISOString();
    if (typeof record._seconds === "number") return new Date(record._seconds * 1000).toISOString();
  }
  return "";
}

function normalizeRole(value: unknown): AdminUserRow["role"] {
  const role = text(value).toLowerCase();
  if (
    role === "community" ||
    role === "employer" ||
    role === "moderator" ||
    role === "admin"
  ) {
    return role;
  }
  return "community";
}

export function normalizeAdminUserRow(value: unknown, fallbackId = ""): AdminUserRow {
  const record = recordFrom(value);
  const email = text(record.email) || text(record.contactEmail);
  const displayName =
    text(record.displayName) ||
    text(record.name) ||
    [text(record.firstName), text(record.lastName)].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    fallbackId;

  return {
    id: text(record.id) || fallbackId,
    displayName,
    email,
    role: normalizeRole(record.role),
    createdAt: toIsoString(record.createdAt) || toIsoString(record.updatedAt),
    photoURL: text(record.photoURL) || undefined,
  };
}
