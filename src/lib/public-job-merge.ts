import { descriptionApplicationDeadline, isJobRecordExpired } from "./listing-freshness";
import { normalizePartnerDescription } from "./server/import-content-quality";

export interface PublicJobMergeRecord {
  id: string;
  slug?: string | null;
  active?: boolean | null;
  status?: string | null;
  [key: string]: unknown;
}

const HIDDEN_JOB_STATUSES = new Set([
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
]);

function normalizeStatus(status?: string | null): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function normalizeIdentity(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
}

export function isPublicJobRecordVisible(job: Pick<PublicJobMergeRecord, "active" | "status"> & Record<string, unknown>, now = new Date()): boolean {
  if (job.active === false) return false;
  return !HIDDEN_JOB_STATUSES.has(normalizeStatus(job.status)) && !isJobRecordExpired(job, now);
}

export function mergePublicJobRecords<
  TImported extends PublicJobMergeRecord,
  TPost extends PublicJobMergeRecord,
>(
  importedJobs: TImported[],
  employerPosts: TPost[],
): Array<TImported | TPost> {
  // Display slugs are not identity. Same-ID jobs remain authoritative over posts;
  // content duplicates with different IDs are resolved below, before visibility/counts.
  const importedIdentities = new Set(importedJobs.map((job) => job.id));
  const merged: Array<TImported | TPost> = [...importedJobs];

  for (const post of employerPosts) {
    if (!importedIdentities.has(post.id)) {
      merged.push(post);
    }
  }

  const seen = new Set<string>();
  const now = new Date();
  const visibility = new Map(merged.map(job => [job, isPublicJobRecordVisible(job, now)]));
  const compareId = (a: PublicJobMergeRecord, b: PublicJobMergeRecord) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return merged.sort((a, b) =>
    Number(!importedIdentities.has(a.id)) - Number(!importedIdentities.has(b.id)) ||
    Number(visibility.get(a)) - Number(visibility.get(b)) || compareId(a, b)
  ).filter(job => {
    const exact = (value: unknown): string => {
      if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : "invalid-date";
      if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return exact(value.toDate());
      return typeof value === "string" ? value.normalize("NFC").replace(/\s+/gu, " ").trim() : typeof value === "number" ? String(value) : "";
    };
    const normalize = (value: unknown) => exact(value).toLowerCase();
    const parts = [job.employerName || job.orgName || job.companyName || job.employerId || job.orgId, job.title, job.location].map(normalize);
    // Missing identity or content is not evidence of a duplicate.
    const closing = exact(job.closingDate || job.deadline || job.applicationDeadline);
    const closingIdentity = !closing.includes("T") ? descriptionApplicationDeadline(`Closing date: ${closing}`) || normalize(closing) : closing;
    // Every supplied destination is evidence; a shared landing URL cannot mask
    // a distinct application URL. Paths and query values remain case-sensitive.
    const destinations = [job.externalUrl, job.applicationUrl, job.applyUrl, job.externalApplyUrl, job.applicationLink].map(exact);
    const intakeEvidence = closingIdentity || exact(job.publishedAt || job.postedAt || job.externalId || job.requisitionId) || destinations.find(Boolean);
    // Normalize only the comparison projection, exactly as the jobs API does.
    // Keep source/display bodies intact, including case-sensitive embedded links.
    const description = typeof job.description === "string"
      ? exact(normalizePartnerDescription(job.description, job.descriptionFormat)) : "";
    const key = parts.every(Boolean) && description && intakeEvidence
      ? JSON.stringify([...parts, closingIdentity, description,
        ...[job.employerId || job.orgId, job.requisitionId || job.requisitionNumber || job.jobRequisitionId,
          job.externalId, job.publishedAt || job.postedAt].map(exact), ...destinations]) : `id:${job.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return visibility.get(job);
  });
}

export function jobMatchesOrganization(job: Record<string, unknown>, organization: Record<string, unknown>): boolean {
  const identities = new Set([organization.id, organization.employerId, organization.name, organization.shortName, organization.orgName].map(normalizeIdentity).filter(Boolean));
  return [job.employerId, job.orgId, job.employerName, job.orgName, job.companyName].map(normalizeIdentity).some(identity => !!identity && identities.has(identity));
}

export function withAuthoritativeJobCounts<
  TOrganization extends Record<string, unknown>,
  TJob extends Record<string, unknown>,
>(organizations: TOrganization[], jobs: TJob[]): Array<TOrganization & { openJobs: number }> {
  const jobIdsByIdentity = new Map<string, Set<string>>();

  jobs.forEach((job, index) => {
    const jobId = typeof job.id === "string" && job.id ? job.id : `job-${index}`;
    const identities = [job.employerId, job.orgId, job.employerName, job.orgName, job.companyName]
      .map(normalizeIdentity)
      .filter(Boolean);
    for (const identity of Array.from(new Set(identities))) {
      const set = jobIdsByIdentity.get(identity) || new Set<string>();
      set.add(jobId);
      jobIdsByIdentity.set(identity, set);
    }
  });

  return organizations.map((organization) => {
    const identities = [
      organization.id,
      organization.employerId,
      organization.name,
      organization.shortName,
      organization.orgName,
    ]
      .map(normalizeIdentity)
      .filter(Boolean);
    const matchingJobIds = new Set<string>();
    for (const identity of Array.from(new Set(identities))) {
      for (const jobId of Array.from(jobIdsByIdentity.get(identity) || [])) matchingJobIds.add(jobId);
    }
    return { ...organization, openJobs: matchingJobIds.size };
  });
}
