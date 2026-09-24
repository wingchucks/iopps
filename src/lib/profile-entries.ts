// Pure, UI-free helpers for profile list entries (education, work experience).
// Kept dependency-free so they can be unit-tested offline and shared by the
// career settings editor and the profile display page.

export interface EducationLabelInput {
  school?: string | null;
  degree?: string | null;
}

export interface WorkExperienceLabelInput {
  title?: string | null;
  employer?: string | null;
}

function nonEmpty(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Human-readable header for an education entry in the editor, e.g.
 * "QA Test University — QA Test Degree". Falls back to "Education 1",
 * "Education 2", ... when the entry has no school/degree yet.
 */
export function educationEntryLabel(
  edu: EducationLabelInput | null | undefined,
  index: number,
): string {
  const school = nonEmpty(edu?.school);
  const degree = nonEmpty(edu?.degree);
  if (school && degree) return `${school} — ${degree}`;
  if (school) return school;
  if (degree) return degree;
  return `Education ${index + 1}`;
}

/**
 * Human-readable header for a work experience entry in the editor, e.g.
 * "Barista — North Battleford Café". Falls back to "Work Experience 1",
 * "Work Experience 2", ... when the entry has no title/employer yet.
 */
export function workExperienceEntryLabel(
  exp: WorkExperienceLabelInput | null | undefined,
  index: number,
): string {
  const title = nonEmpty(exp?.title);
  const employer = nonEmpty(exp?.employer);
  if (title && employer) return `${title} — ${employer}`;
  if (title) return title;
  if (employer) return employer;
  return `Work Experience ${index + 1}`;
}

/** Append a fresh (cloned) entry to the list. */
export function addEntry<T>(entries: T[], empty: T): T[] {
  return [...entries, { ...(empty as Record<string, unknown>) } as T];
}

/** Update one field of one entry; entries outside the index are untouched. */
export function updateEntry<T>(
  entries: T[],
  index: number,
  field: keyof T,
  value: T[keyof T],
): T[] {
  return entries.map((entry, i) =>
    i === index ? { ...entry, [field]: value } : entry,
  );
}

/** Remove the entry at the index. */
export function removeEntry<T>(entries: T[], index: number): T[] {
  return entries.filter((_, i) => i !== index);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format an HTML <input type="month"> value ("YYYY-MM") as "Jun 2022".
 * Returns "" for empty or invalid values.
 */
export function formatWorkDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})$/.exec((value ?? "").trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Display a work experience date range, e.g. "Jun 2022 — Present".
 * An empty end date means the role is current.
 */
export function formatWorkDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = formatWorkDate(startDate);
  const end = formatWorkDate(endDate);
  if (start && end) return `${start} — ${end}`;
  if (start) return `${start} — Present`;
  if (end) return end;
  return "";
}
