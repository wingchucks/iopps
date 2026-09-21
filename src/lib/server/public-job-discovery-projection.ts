type Job = Record<string, unknown> & { id: string };
const text = (value: unknown) => typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
const label = (value: unknown) => text(value).normalize("NFC").replace(/\s+/gu, " ").toLowerCase();

function discoveryKey(job: Job): string | null {
  if (job.source !== "feed") return null;
  const target = text(job.externalUrl);
  try {
    const url = new URL(target);
    if (url.protocol !== "https:" || url.hostname !== "workforcenow.adp.com" || url.username || url.password || url.port || url.hash ||
      url.pathname !== "/mascsr/default/mdf/recruitment/recruitment.html" ||
      url.searchParams.getAll("cid").length !== 1 || !url.searchParams.get("cid") ||
      url.searchParams.getAll("jobId").length !== 1 || !url.searchParams.get("jobId")) return null;
  } catch { return null; }
  const labels = [job.employerName, job.title, job.location].map(label);
  if (job.jobType && job.employmentType && label(job.jobType) !== label(job.employmentType)) return null;
  const published = text(job.publishedAt);
  // This is an identity comparison, not a display-date conversion. Only the
  // observed feed calendar-midnight / timestamp pair may share a source day.
  if (!labels.every(Boolean) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(published) ||
    !Number.isFinite(Date.parse(published)) || new Date(published).toISOString() !== published) return null;
  // Employer IDs may differ only in this read-only projection; secondary owner
  // evidence is not covered by the six validated pairs and must remain distinct.
  // Keep source-date/lifecycle evidence aligned with public-job-merge; display
  // fallback precedence must not hide independently supplied dates. Local
  // createdAt/updatedAt/order are not source identity. publishedAt alone uses
  // the narrowly validated source-day compatibility rule above/below.
  const evidenceFields = ["orgId", "orgName", "companyName", "department", "closingDate", "deadline", "applicationDeadline", "expiresAt", "intake", "intakeId", "requisitionId", "requisitionNumber", "jobRequisitionId", "externalId",
    "startDate", "endDate", "intakeStartDate", "intakeEndDate", "postedAt", "sourcePostingDate", "datePosted", "sourceVerifiedAt", "endAt", "salary", "salaryRange", "compensation", "workLocation", "remoteFlag", "positions",
    "sourceUrl", "applicationUrl", "applicationLink", "applyUrl", "externalApplyUrl"];
  // Unsupported structured evidence is uncertainty, never an empty string.
  if (evidenceFields.some(field => job[field] != null && !["string", "number", "boolean"].includes(typeof job[field]))) return null;
  return JSON.stringify([target, ...labels, published.slice(0, 10), label(job.jobType || job.employmentType),
    ...evidenceFields.map(field => typeof job[field] === "boolean" ? job[field] : text(job[field]))]);
}

/** Read-only list projection, NEVER an identity/ownership resolver.
 * Run only after lifecycle and request-scoping filters. Return one untouched
 * representative (stable ID ordering); do not create aliases, transfer fields,
 * redirect details, modify saves/applications, or infer employer equivalence.
 */
export function projectPublicJobDiscovery<T extends Job>(jobs: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const job of jobs) {
    const key = discoveryKey(job) || `id:${job.id}`;
    const group = groups.get(key) || [];
    group.push(job);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap(group => {
    const timestamps = new Set(group.map(job => text(job.publishedAt)).filter(value => !value.endsWith("T00:00:00.000Z")));
    // Two distinct true timestamps may describe different intakes that day.
    if (timestamps.size > 1) return group;
    return [group.reduce((first, job) => job.id < first.id ? job : first)];
  });
}
