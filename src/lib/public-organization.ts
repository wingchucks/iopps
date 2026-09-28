// Public profiles expose only the information intended for the directory.
// Billing, owner identifiers, email templates and internal notes stay private.
const PUBLIC_ORGANIZATION_FIELDS = [
  "id", "name", "slug", "type", "shortName", "description", "tagline", "logo", "logoUrl", "bannerUrl",
  "businessIdentity", "indigenousOwned", "industry", "size", "employees", "foundedYear", "foundedYearVerified", "since",
  "location", "address", "website", "phone", "socialLinks", "hours", "services", "tags", "gallery", "videos",
  "nation", "treatyTerritory", "communityAffiliation", "indigenousGroups", "hiringStatus", "partnershipInterests",
  "verified", "openJobs", "ownerType", "isPartner", "partnerTier", "partnerLabel", "partnerBadgeLabel", "partnerSection", "promotionWeight",
  "institutionType", "studentBodySize", "accreditation", "campusCount", "enrollmentStatus", "programCount", "scholarshipCount", "trainingCount",
  "programs", "keyStudyAreas", "areasOfStudy", "previewHighlights", "careersUrl", "studentCount", "graduationRate", "employmentRate", "profileMode",
] as const;

/**
 * Linear-time plausibility check (no backtracking regex): one "@" with text
 * before it, a domain containing an inner ".", no whitespace, at most 254 chars.
 */
export function isPlausibleEmail(value: string): boolean {
  if (!value || value.length > 254 || /\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

/**
 * The only email an organization shows publicly: the owner's explicit, opt-in
 * public contact. The stored contactEmail is IOPPS's private way to reach the
 * organization (copied from signup) and is never published.
 */
export function publicContactEmailOf(record: Record<string, unknown>): string | null {
  const value = typeof record.publicContactEmail === "string" ? record.publicContactEmail.trim() : "";
  return value && isPlausibleEmail(value) ? value : null;
}

export function isPublicContactEmailValid(value: string): boolean {
  return isPlausibleEmail(value.trim());
}

export function toPublicOrganization(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of PUBLIC_ORGANIZATION_FIELDS) {
    if (record[key] !== undefined) result[key] = record[key];
  }
  // Public pages read contactEmail; it carries only the opt-in public address.
  const contactEmail = publicContactEmailOf(record);
  if (contactEmail) result.contactEmail = contactEmail;
  return result;
}
