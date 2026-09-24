import { descriptionText } from "@/lib/description-text";
import { publicImportSourceMetadata } from "@/lib/server/import-source-metadata";
import { sourcePostingDatePatch } from "@/lib/server/source-posting-date";

// Public responses are positive projections, so future internal fields stay private.
const fields = new Set([
  "id", "slug", "type", "title", "status", "active", "orgId", "employerId", "orgName", "orgShort",
  "employerName", "companyName", "companyLogoUrl", "logo", "logoUrl", "location", "employmentType",
  "jobType", "workLocation", "positions", "salary", "salaryRange", "description", "requirements",
  "responsibilities", "qualifications", "benefits", "applicationUrl", "applicationLink", "externalApplyUrl",
  "externalUrl", "contactEmail", "featured", "closingSoon", "closingDate", "deadline", "expiresAt",
  "createdAt", "updatedAt", "postedAt", "publishedAt", "order", "remoteFlag", "indigenousPreference",
  "indigenousPreferenceLevel", "communityTags", "hiringDetails", "willTrain", "driversLicense", "requiresResume",
  "requiresCoverLetter", "requiresReferences", "category", "department", "source", "_source", "sourceName",
  "sourceUrl", "dates", "price", "eventType", "organizer", "schedule", "highlights", "amount", "eligibility",
  "duration", "credential", "programUrl", "quote", "community", "author", "authorUid", "authorName", "authorPhoto",
  "featuredImage", "excerpt", "badges", "province", "city", "country", "remote", "applyMethod",
]);
export function publicContentRecord(record: Record<string, unknown>): Record<string, unknown> {
  const projected = Object.fromEntries(Object.entries(record).filter(([key]) => fields.has(key)));
  // Paid publication time is not evidence of an employer's original source date.
  if (record.source === 'feed' && Object.hasOwn(record, 'publication')) delete projected.postedAt;
  // Never forward nested values or promote inherited calendar provenance.
  if (Object.hasOwn(record, "sourcePostingDate")) {
    Object.assign(projected, sourcePostingDatePatch(record.sourcePostingDate));
  }
  const sourceMetadata = publicImportSourceMetadata(record);
  if (sourceMetadata) projected.sourceMetadata = sourceMetadata;
  if (typeof record.description === "string") {
    projected.description = descriptionText(record.description, record.descriptionFormat);
    projected.descriptionFormat = "plain-text";
  }
  return projected;
}
