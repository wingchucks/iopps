// Copy only editable content. Authorization and fresh identity come from the create API.
export function buildEmployerJobDuplicate(job: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const field of ["department", "category", "employmentType", "workLocation", "location", "salary", "salaryRange", "externalApplyUrl", "applicationUrl", "description", "responsibilities", "qualifications", "benefits", "indigenousPreference", "indigenousPreferenceLevel", "communityTags", "hiringDetails", "willTrain", "driversLicense", "requiresResume", "requiresCoverLetter", "requiresReferences"]) {
    if (job[field] !== undefined) copy[field] = job[field];
  }
  return { ...copy, title: `${String(job.title || "Job")} (copy)`, status: "draft", featured: false, closingDate: "" };
}
