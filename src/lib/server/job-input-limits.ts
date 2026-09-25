// Employer-authored job text limits (imported feeds use their own paths).
export const JOB_TITLE_MAX = 200;
export const JOB_DESCRIPTION_MAX = 30000;
const JOB_OTHER_TEXT_MAX = 5000;
// List fields persisted from the request (non-array values are dropped by the routes).
const JOB_LIST_FIELDS = ["responsibilities", "qualifications", "benefits", "badges", "communityTags"];
const JOB_LIST_ITEMS_MAX = 200;
const JOB_SALARY_RANGE_KEYS_MAX = 10;

function listLimitError(value: unknown[]): boolean {
  let total = 0;
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (item.length > JOB_OTHER_TEXT_MAX) return true;
    total += item.length;
  }
  return value.length > JOB_LIST_ITEMS_MAX || total > JOB_DESCRIPTION_MAX;
}

// salaryRange is stored as sent ({ min, max, period, currency, display }), so
// only a small flat object with scalar values is accepted.
function salaryRangeLimitError(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== "object" || Array.isArray(value)) return true;
  const entries = Object.entries(value);
  return entries.length > JOB_SALARY_RANGE_KEYS_MAX || entries.some(([, field]) =>
    field !== null && (typeof field === "string" ? field.length > JOB_OTHER_TEXT_MAX : !["number", "boolean"].includes(typeof field)));
}

/** Returns the first job field that exceeds its limit, or null. */
export function jobInputLimitError(input: Record<string, unknown>): string | null {
  if (typeof input.title === "string" && input.title.trim().length > JOB_TITLE_MAX) return "title";
  if (typeof input.description === "string" && input.description.length > JOB_DESCRIPTION_MAX) return "description";
  for (const [key, value] of Object.entries(input)) {
    if (key !== "title" && key !== "description" && typeof value === "string" && value.length > JOB_OTHER_TEXT_MAX) return key;
  }
  for (const key of JOB_LIST_FIELDS) {
    const value = input[key];
    if (Array.isArray(value) && listLimitError(value)) return key;
  }
  if (salaryRangeLimitError(input.salaryRange)) return "salaryRange";
  return null;
}
