/** Shared publishing taxonomy. Classification never changes posting identity or copy. */
export const JOB_AREAS = ["Administration", "Agriculture", "Arts & Culture", "Business", "Construction & Trades", "Education", "Environment & Land", "Finance", "Government & Public Service", "Health & Wellness", "Hospitality & Tourism", "Human Resources", "Information Technology", "Legal", "Management", "Marketing & Communications", "Natural Resources", "Social Services", "Transportation", "Other"] as const;
export type JobArea = typeof JOB_AREAS[number];
type Job = { title?: unknown; category?: unknown };
const key = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/gu, " ");
const canonical = new Map<string, JobArea>(JOB_AREAS.map(area => [key(area), area]));
for (const alias of ["Health", "Healthcare", "Nursing", "Mental Health & Wellness", "Mental Health & Addictions", "Health / Mental Health"]) canonical.set(key(alias), "Health & Wellness");

// Deliberately bounded role phrases, not employer names, boilerplate, broad
// department names or words such as "student", "support", "field" or "manager".
const titleRules: readonly [JobArea, RegExp][] = [
  ["Finance", /\b(?:insurance (?:advisor|administrator)|commercial insurance|personal lines insurance|actuarial analyst|accountant|accounting technician|accounts payable|bookkeeper|comptroller|financial (?:analyst|accountant)|finance manager|payroll officer)\b/i],
  ["Human Resources", /\b(?:human resources|HR business partner|talent acquisition|people & performance|talent & wellbeing|learning & development consultant)\b/i],
  ["Health & Wellness", /\b(?:nurse|nursing|RN|LPN|psychologist|therapist|mental health|addictions counsellor|wellness worker|health system)\b/i],
  ["Social Services", /\b(?:harm reduction outreach worker|social worker|family (?:services?|support) worker|child (?:support|protection|& youth services|and youth) (?:worker|investigator)|childyouth support worker|CFS case worker|reintegration case worker|housing (?:support )?worker|post[- ]majority (?:care|worker|support)|home visitor|youth worker|cultural support worker)\b/i],
  ["Education", /\b(?:teacher|teaching opportunity|early childhood educator|educational assistants?|early learning childcare worker|literacy consultant|education director|research chair)\b/i],
  ["Information Technology", /\b(?:IT (?:technician|student|solutions)|information technology|data engineer|configuration analyst, telecommunications|UI-UX designer|software (?:engineer|developer))\b/i],
  ["Hospitality & Tourism", /\b(?:cook|bartender|food-beverage|dishwasher|guest services representative)\b/i],
  ["Administration", /\b(?:administrative assistant|office assistant|registry clerk|operations clerk|receptionist|scheduler|motor licen[cs]e issuer)\b/i],
  ["Construction & Trades", /\b(?:maintenance technician|electrician|plumber|carpenter)\b/i],
  ["Marketing & Communications", /\b(?:marketing|communications (?:manager|specialist)|director of communications|digital sales)\b/i],
  ["Agriculture", /\bfarm worker\b/i],
  ["Transportation", /\b(?:driver|transportation coordinator)\b/i],
  ["Legal", /\b(?:lawyer|paralegal|legal counsel)\b/i],
  ["Environment & Land", /\blands manager\b/i],
];
export type JobClassification = { category: JobArea | ""; source: "category" | "title" | "unresolved"; evidence: string };
export function classifyJobArea(job: Job): JobClassification {
  if (typeof job.category === "string" && job.category.trim()) {
    const category = canonical.get(key(job.category));
    return { category: category || "", source: category ? "category" : "unresolved", evidence: job.category };
  }
  // Malformed explicit values are review cases, not permission to retag.
  if (job.category != null && job.category !== "") return { category: "", source: "unresolved", evidence: "invalid-category" };
  const title = typeof job.title === "string" ? job.title.normalize("NFC") : "";
  const matches = titleRules.filter(([, pattern]) => pattern.test(title));
  if (matches.length !== 1) return { category: "", source: "unresolved", evidence: matches.length ? "ambiguous-title" : "insufficient-title-evidence" };
  return { category: matches[0][0], source: "title", evidence: title.match(matches[0][1])![0] };
}

/** Narrow patch: unknowns stay unknown, and all unrelated fields remain intact. */
export function jobCategoryPatch(job: Job): { category?: JobArea } {
  const result = classifyJobArea(job);
  return result.category && result.category !== job.category ? { category: result.category } : {};
}
