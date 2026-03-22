import type { AdminEmployerRow, AdminEmployerStatus } from "./view-types";

type UnknownRecord = Record<string, unknown>;

const PLAN_TIER_LABELS = {
  standard: "Standard - $1,250/yr",
  premium: "Premium - $2,500/yr",
  school: "School Tier - $5,500/yr",
} as const;

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
    if (typeof record.toDate === "function") {
      return record.toDate().toISOString();
    }
    if (typeof record.seconds === "number") {
      return new Date(record.seconds * 1000).toISOString();
    }
    if (typeof record._seconds === "number") {
      return new Date(record._seconds * 1000).toISOString();
    }
  }
  return "";
}

function normalizeStatus(record: UnknownRecord): AdminEmployerStatus {
  if (record.disabled === true) return "disabled";

  const status = text(record.status).toLowerCase();
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "disabled" ||
    status === "incomplete"
  ) {
    return status;
  }

  return "incomplete";
}

function resolveDisplayName(record: UnknownRecord, fallbackId: string): string {
  return (
    text(record.organizationName) ||
    text(record.name) ||
    text(record.companyName) ||
    text(record.slug) ||
    fallbackId
  );
}

function normalizePaidTier(value: unknown): keyof typeof PLAN_TIER_LABELS | null {
  const candidate = text(value).toLowerCase();
  if (!candidate) return null;

  if (candidate === "tier1" || candidate === "standard" || candidate === "essential") {
    return "standard";
  }
  if (candidate === "tier2" || candidate === "premium" || candidate === "professional") {
    return "premium";
  }
  if (candidate === "tier3" || candidate === "school") {
    return "school";
  }

  return null;
}

function isSchoolAdminRecord(record: UnknownRecord): boolean {
  const type = text(record.type).toLowerCase();
  const tier = text(record.tier).toLowerCase();
  const plan = text(record.plan).toLowerCase();
  const ownerType = text(record.ownerType).toLowerCase();
  const partnerTier = text(record.partnerTier).toLowerCase();

  return [type, tier, plan, ownerType, partnerTier].includes("school");
}

function getPublicHref(record: UnknownRecord, id: string, slug: string, accountType: "business" | "school"): string {
  const publicKey = slug || id || text(record.id);
  if (!publicKey) {
    return accountType === "school" ? "/schools" : "/businesses";
  }

  return accountType === "school" ? `/schools/${publicKey}` : `/org/${publicKey}`;
}

function resolvePlanLabel(record: UnknownRecord): string | undefined {
  const normalizedTier = normalizePaidTier(
    text(record.subscriptionTier) || text(record.plan) || text(record.partnerTier),
  );

  return normalizedTier ? PLAN_TIER_LABELS[normalizedTier] : undefined;
}

function resolveVerificationSummary(record: UnknownRecord): string | undefined {
  if (record.verified === true) return "Verified";

  const verificationStatus = text(record.verificationStatus);
  if (!verificationStatus) return undefined;

  return verificationStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeAdminEmployerRow(
  value: unknown,
  fallbackId = "",
): AdminEmployerRow {
  const record = recordFrom(value);
  const id = text(record.id) || fallbackId;
  const displayName = resolveDisplayName(record, id);
  const slug = text(record.slug) || id;
  const accountType = isSchoolAdminRecord(record) ? "school" : "business";
  const contactName =
    text(record.contactPerson) ||
    text(record.contactName) ||
    text(record.ownerName) ||
    displayName;
  const contactEmail =
    text(record.email) || text(record.contactEmail) || text(record.ownerEmail);

  return {
    id,
    displayName,
    organizationName: displayName,
    contactName,
    contactEmail,
    accountType,
    status: normalizeStatus(record),
    createdAt:
      toIsoString(record.createdAt) ||
      toIsoString(record.updatedAt) ||
      toIsoString(record.approvedAt),
    slug,
    publicHref: getPublicHref(record, id, slug, accountType),
    planLabel: resolvePlanLabel(record),
    verificationSummary: resolveVerificationSummary(record),
  };
}

export function normalizeAdminEmployerRows(values: unknown[]): AdminEmployerRow[] {
  return values.map((value) => {
    const record = recordFrom(value);
    const fallbackId = text(record.id);
    return normalizeAdminEmployerRow(record, fallbackId);
  });
}
