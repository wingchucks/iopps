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

export function isPublicJobRecordVisible(job: Pick<PublicJobMergeRecord, "active" | "status">): boolean {
  if (job.active === false) return false;
  return !HIDDEN_JOB_STATUSES.has(normalizeStatus(job.status));
}

export function mergePublicJobRecords<
  TImported extends PublicJobMergeRecord,
  TPost extends PublicJobMergeRecord,
>(
  importedJobs: TImported[],
  employerPosts: TPost[],
): Array<TImported | TPost> {
  const importedIdentities = new Set(
    importedJobs.flatMap((job) => [normalizeIdentity(job.id), normalizeIdentity(job.slug)]).filter(Boolean),
  );
  const merged: Array<TImported | TPost> = [...importedJobs];

  for (const post of employerPosts) {
    const postIdentities = [normalizeIdentity(post.id), normalizeIdentity(post.slug)].filter(Boolean);
    if (!postIdentities.some((identity) => importedIdentities.has(identity))) {
      merged.push(post);
    }
  }

  return merged.filter(isPublicJobRecordVisible);
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
