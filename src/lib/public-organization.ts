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

const PUBLIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The only email an organization shows publicly: the owner's explicit, opt-in
 * public contact. The stored contactEmail is IOPPS's private way to reach the
 * organization (copied from signup) and is never published.
 */
export function publicContactEmailOf(record: Record<string, unknown>): string | null {
  const value = typeof record.publicContactEmail === "string" ? record.publicContactEmail.trim() : "";
  return value && PUBLIC_EMAIL_PATTERN.test(value) ? value : null;
}

export function isPublicContactEmailValid(value: string): boolean {
  return PUBLIC_EMAIL_PATTERN.test(value.trim());
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
