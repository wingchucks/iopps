export type PublicOwnerType = "school" | "business" | "organization" | "unknown";
export type PublicContentType = "job" | "event" | "scholarship" | "program" | "training";

export type JsonRecord = Record<string, unknown>;

export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function matchesOrgName(value: unknown, orgName: string): boolean {
  const candidate = normalizeText(value);
  const target = normalizeText(orgName);
  if (!candidate || !target) return false;
  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

export function deriveOwnerType(org: JsonRecord | null | undefined): PublicOwnerType {
  if (!org) return "unknown";

  const type = normalizeText(org.type);
  const tier = normalizeText(org.tier);
  const plan = normalizeText(org.plan);
  const institutionType = normalizeText(org.institutionType);

  if (type === "school" || tier === "school" || plan === "school" || institutionType) {
    return "school";
  }

  if (type === "non-profit" || type === "government") {
    return "organization";
  }

  if (
    type === "business" ||
    type === "employer" ||
    type === "legal" ||
    type === "professional" ||
    tier === "premium" ||
    tier === "standard"
  ) {
    return "business";
  }

  return "organization";
}

export function isSchoolOwner(org: JsonRecord | null | undefined): boolean {
  return deriveOwnerType(org) === "school";
}

export function withPublicOwnership(
  item: JsonRecord,
  options: {
    contentType: PublicContentType;
    ownerType?: PublicOwnerType;
    ownerId?: string;
    ownerName?: string;
    ownerSlug?: string;
  },
): JsonRecord {
  return {
    ...item,
    contentType: options.contentType,
    ownerType: options.ownerType ?? item.ownerType ?? "unknown",
    ownerId: options.ownerId ?? item.ownerId ?? item.orgId ?? item.employerId ?? "",
    ownerName: options.ownerName ?? item.ownerName ?? item.orgName ?? item.organization ?? item.provider ?? "",
    ownerSlug: options.ownerSlug ?? item.ownerSlug ?? item.orgSlug ?? item.ownerId ?? item.orgId ?? item.employerId ?? "",
  };
}

export function getOwnerProfileHref(
  ownerType: PublicOwnerType | undefined,
  ownerSlug: string | undefined,
): string | null {
  const slug = normalizeText(ownerSlug);
  if (!slug) return null;
  return ownerType === "school" ? `/schools/${slug}` : `/org/${slug}`;
}

export function getScholarshipSourceLabel(ownerType: PublicOwnerType | undefined): string {
  switch (ownerType) {
    case "school":
      return "School Scholarship";
    case "business":
      return "Employer Scholarship";
    case "organization":
      return "Organization Scholarship";
    default:
      return "Scholarship";
  }
}
