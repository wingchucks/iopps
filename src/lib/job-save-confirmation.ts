export interface JobSaveConfirmation { title: string; description: string; }
type ReadJob = (url: string) => Promise<{ ok: boolean; json: () => Promise<{ job?: { status?: string; active?: boolean } }> }>;

/** Read back the saved record: the requested status is not a publication receipt. */
export async function confirmSavedJob(jobId: string, read: ReadJob): Promise<JobSaveConfirmation> {
  try {
    const response = await read(`/api/employer/jobs/${encodeURIComponent(jobId)}`);
    const data = await response.json();
    if (response.ok && data.job?.status === 'draft') {
      return { title: 'Draft saved', description: 'Your draft is saved privately. Review and publish it when you are ready.' };
    }
    if (response.ok && data.job?.status === 'pending') {
      return { title: 'Submitted for review', description: 'Your job is awaiting review and is not publicly visible yet.' };
    }
    if (response.ok && data.job?.status === 'active' && data.job.active === true) {
      return { title: 'Published', description: 'Your job is published. Manage the posting and applications from your dashboard.' };
    }
  } catch { /* A saved write must not be retried just because confirmation failed. */ }
  return { title: 'Job saved', description: 'Check your jobs dashboard to confirm the publication status before sharing this posting.' };
}
