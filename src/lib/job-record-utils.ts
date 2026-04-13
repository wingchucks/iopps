const PROVINCE_CODES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

const CITY_TOKEN = "[A-Z][A-Za-z'&.\\-]+";
const LOCATION_PATTERN = new RegExp(
  `\\b((${CITY_TOKEN})(?:\\s+${CITY_TOKEN}){0,3},\\s?(?:${PROVINCE_CODES.join("|")}))\\b`,
  "g",
);
const BRANCH_LOCATION_PATTERN = new RegExp(
  `\\bin (?:our\\s+)?(${CITY_TOKEN}(?:\\s+${CITY_TOKEN}){0,2})(?:\\s*-\\s*${CITY_TOKEN}(?:\\s+${CITY_TOKEN}){0,3})?\\s+(?:branch|office)\\b`,
  "g",
);
const NATIONAL_LOCATION_PATTERN =
  /\b(?:based anywhere nationally|anywhere nationally|anywhere in canada|across canada|nationwide)\b/i;

const EMPLOYMENT_TYPE_PATTERNS: Array<[RegExp, string]> = [
  [/\bfull[\s-]?time term\b/i, "Full-time Term"],
  [/\bfull[\s-]?time\b/i, "Full-time"],
  [/\bpart[\s-]?time\b/i, "Part-time"],
  [/\bcasual\b/i, "Casual"],
  [/\bcontract\b/i, "Contract"],
  [/\btemporary\b/i, "Temporary"],
  [/\bintern(?:ship)?\b/i, "Internship"],
  [/\bpermanent\b/i, "Permanent"],
];

type JobLikeRecord = Record<string, unknown>;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function coerceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function resolveExternalApplicationUrl(job: JobLikeRecord): string | undefined {
  const candidates = [
    job.applicationUrl,
    job.externalApplyUrl,
    job.applyUrl,
    job.applicationLink,
    job.externalUrl,
    job.sourceUrl,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return candidates[0] || undefined;
}

export function inferJobLocation(job: JobLikeRecord): string {
  const direct = normalizeText(job.location);
  if (direct) return direct;

  const description = coerceText(job.description);
  if (!description) return "";

  const preciseMatches = [...description.matchAll(LOCATION_PATTERN)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);

  const preciseUnique = uniqueStrings(preciseMatches).slice(0, 3);
  if (preciseUnique.length > 0) {
    return preciseUnique.join(" · ");
  }

  const branchMatches = [...description.matchAll(BRANCH_LOCATION_PATTERN)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
  const branchUnique = uniqueStrings(branchMatches).slice(0, 3);
  if (branchUnique.length > 0) {
    return branchUnique.join(" · ");
  }

  if (NATIONAL_LOCATION_PATTERN.test(description)) {
    return "Canada-wide";
  }

  return "";
}

export function inferJobEmploymentType(job: JobLikeRecord): string {
  const direct = normalizeText(job.employmentType) || normalizeText(job.jobType);
  if (direct) return direct;

  const haystack = [coerceText(job.title), coerceText(job.description)].join("\n");
  if (!haystack.trim()) return "";

  for (const [pattern, label] of EMPLOYMENT_TYPE_PATTERNS) {
    if (pattern.test(haystack)) return label;
  }

  return "";
}

export function applyJobDisplayFallbacks<T extends JobLikeRecord>(job: T): T {
  const next = { ...job } as JobLikeRecord;

  const location = inferJobLocation(job);
  if (!normalizeText(next.location) && location) {
    next.location = location;
  }

  const employmentType = inferJobEmploymentType(job);
  if (!normalizeText(next.employmentType) && employmentType) {
    next.employmentType = employmentType;
  }
  if (!normalizeText(next.jobType) && employmentType) {
    next.jobType = employmentType;
  }

  const applicationUrl = resolveExternalApplicationUrl(job);
  if (!normalizeText(next.applicationUrl) && applicationUrl) {
    next.applicationUrl = applicationUrl;
  }

  return next as T;
}
