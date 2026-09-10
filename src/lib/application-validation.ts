import { isJobRecordExpired } from "./listing-freshness.ts";
import { resolveApplicationDestination } from "./application-destination.ts";
export type ApplicationDocuments = { resumeUrl?: unknown; resumeType?: unknown; coverLetter?: unknown; references?: unknown; profileSnapshot?: unknown };
const present = (value: unknown) => typeof value === "string" && value.trim().length > 0;
export function validateApplicationDocuments(job: object, documents: ApplicationDocuments): string | null {
  const record = job as Record<string, unknown>;
  if (record.requiresResume && !present(documents.resumeUrl)) return "A resume file is required.";
  if (record.requiresCoverLetter && !present(documents.coverLetter)) return "A cover letter is required.";
  if (record.requiresReferences && !present(documents.references)) return "References are required.";
  return null;
}
export function validateApplicationSubmission(job: Record<string, unknown>, documents: ApplicationDocuments, now = new Date()): string | null {
  if ((job.type && job.type !== "job") || job.active === false || job.deletedAt || job.archivedAt ||
      (job.status && !["active", "published", "approved", "open"].includes(String(job.status).toLowerCase())) || isJobRecordExpired(job, now)) {
    return "This job is no longer accepting applications.";
  }
  if (resolveApplicationDestination(job, "job").kind !== "internal") return "Apply using the employer’s application destination.";
  return validateApplicationDocuments(job, documents);
}
