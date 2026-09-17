// Shared server allowlist. Keep personal-field changes aligned with firestore.rules.
export const PERSONAL_PROFILE_FIELDS = new Set([
  "displayName", "name", "community", "location", "bio", "interests", "photoURL",
  "nation", "territory", "languages", "headline", "skillsText", "openToWork",
  "targetRoles", "salaryRange", "workPreference", "skills", "education", "resumeUrl",
  "resumeURL", "resumeFileName", "resumeUploadedAt", "hideFromDirectory",
  "onboardingComplete", "band", "pronouns", "title", "experienceLevel", "industry",
  "preferredLocation", "remoteOk", "jobTypes", "willingToRelocate",
]);

export function personalProfileUpdates(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => PERSONAL_PROFILE_FIELDS.has(key)));
}
