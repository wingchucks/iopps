// Public profiles expose only the information intended for the directory.
// Billing, owner identifiers, email templates and internal notes stay private.
const PUBLIC_ORGANIZATION_FIELDS = [
  "id", "name", "slug", "type", "shortName", "description", "tagline", "logo", "logoUrl", "bannerUrl",
  "businessIdentity", "indigenousOwned", "industry", "size", "employees", "foundedYear", "foundedYearVerified", "since",
  "location", "address", "website", "contactEmail", "phone", "socialLinks", "hours", "services", "tags", "gallery", "videos",
  "nation", "treatyTerritory", "communityAffiliation", "indigenousGroups", "hiringStatus", "partnershipInterests",
  "verified", "openJobs", "ownerType", "isPartner", "partnerTier", "partnerLabel", "partnerBadgeLabel", "partnerSection", "promotionWeight",
  "institutionType", "studentBodySize", "accreditation", "campusCount", "enrollmentStatus", "programCount", "scholarshipCount", "trainingCount",
  "programs", "keyStudyAreas", "areasOfStudy", "previewHighlights", "careersUrl", "studentCount", "graduationRate", "employmentRate", "profileMode",
] as const;

export function toPublicOrganization(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of PUBLIC_ORGANIZATION_FIELDS) {
    if (record[key] !== undefined) result[key] = record[key];
  }
  return result;
}
