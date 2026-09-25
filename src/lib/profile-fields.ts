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

// Abuse-level caps, not UX limits: established long profile values (setup L1)
// stay valid, while oversized writes that push a profile document toward
// Firestore's 1 MiB limit are rejected. Keep aligned with withinProfileLimits()
// in firestore.rules.
const SHORT_TEXT_MAX = 5000;
export const PROFILE_TEXT_LIMITS: Record<string, number> = {
  displayName: 200, name: 200, pronouns: SHORT_TEXT_MAX, band: SHORT_TEXT_MAX, title: SHORT_TEXT_MAX,
  headline: SHORT_TEXT_MAX, community: SHORT_TEXT_MAX, location: SHORT_TEXT_MAX, nation: SHORT_TEXT_MAX,
  territory: SHORT_TEXT_MAX, languages: SHORT_TEXT_MAX, preferredLocation: SHORT_TEXT_MAX,
  industry: SHORT_TEXT_MAX, experienceLevel: SHORT_TEXT_MAX, workPreference: SHORT_TEXT_MAX,
  bio: 20000, skillsText: 20000, resumeFileName: 1000, photoURL: 4096, resumeUrl: 4096, resumeURL: 4096,
};
const LIST_LIMIT = { items: 200, length: 300 };
export const PROFILE_LIST_LIMITS: Record<string, { items: number; length: number }> = {
  // Skills are derived from skillsText, so an established list can be long.
  interests: LIST_LIMIT, targetRoles: LIST_LIMIT, skills: { items: 1000, length: 300 }, jobTypes: LIST_LIMIT,
};

/** Returns the first profile field that exceeds its limit or has the wrong shape, or null. */
export function profileFieldLimitError(input: Record<string, unknown>): string | null {
  // Absent and null values are allowed (null clears a field); any other shape
  // must match the field type so objects/arrays cannot bypass the caps.
  for (const [key, max] of Object.entries(PROFILE_TEXT_LIMITS)) {
    const value = input[key];
    if (value == null) continue;
    if (typeof value !== "string" || value.length > max) return key;
  }
  for (const [key, { items, length }] of Object.entries(PROFILE_LIST_LIMITS)) {
    const value = input[key];
    if (value == null) continue;
    if (!Array.isArray(value) || value.length > items || value.some(item => typeof item !== "string" || item.length > length)) return key;
  }
  const education = input.education;
  if (Array.isArray(education) && (education.length > 100 || JSON.stringify(education).length > 100000)) return "education";
  return null;
}
