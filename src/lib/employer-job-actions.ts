/* Pure list helpers for the Jobs dashboard row actions (bug 18).
   Delete removes the job from the list; Close Position marks it closed.
   Both are unit-tested offline; the Jobs page wires them to the
   confirm dialog + /api/employer/jobs/[id] calls. */

export interface DashboardJobLike {
  id: string;
  status?: string;
}

/** Remove a deleted job from the Jobs list state. */
export function removeJobFromList<T extends DashboardJobLike>(
  jobs: T[],
  jobId: string,
): T[] {
  return jobs.filter((job) => job.id !== jobId);
}

/** Mark a closed position in the Jobs list state. */
export function markJobClosedInList<T extends DashboardJobLike>(
  jobs: T[],
  jobId: string,
): T[] {
  return jobs.map((job) =>
    job.id === jobId ? { ...job, status: "closed" } : job,
  );
}

/**
 * Whether a job id should still appear in Overview/Analytics listings.
 * Deleted (tombstoned) jobs are excluded everywhere the dashboard reads.
 */
export function isJobVisibleInDashboard(job: {
  status?: unknown;
  deletedAt?: unknown;
}): boolean {
  return job.status !== "deleted" && !job.deletedAt;
}
