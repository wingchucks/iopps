// Employer-authored job text limits (imported feeds use their own paths).
export const JOB_TITLE_MAX = 200;
export const JOB_DESCRIPTION_MAX = 30000;
const JOB_OTHER_TEXT_MAX = 5000;

/** Returns the first job field that exceeds its limit, or null. */
export function jobInputLimitError(input: Record<string, unknown>): string | null {
  if (typeof input.title === "string" && input.title.trim().length > JOB_TITLE_MAX) return "title";
  if (typeof input.description === "string" && input.description.length > JOB_DESCRIPTION_MAX) return "description";
  for (const [key, value] of Object.entries(input)) {
    if (key !== "title" && key !== "description" && typeof value === "string" && value.length > JOB_OTHER_TEXT_MAX) return key;
  }
  return null;
}
