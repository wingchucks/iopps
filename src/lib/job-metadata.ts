type MetadataJob = { salary?: unknown; salaryRange?: unknown; description?: unknown; workLocation?: unknown; remoteFlag?: unknown };

/** Read-time enrichment; retain explicit compensation and work-location choices. */
export function normalizeJobDiscoveryMetadata<T extends MetadataJob>(job: T): T {
  if (typeof job.description !== "string") return job;
  const description = job.description.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
  let normalized = { ...job };
  // Require a statement about this role, not a general mention of remote benefits.
  if (!job.workLocation && !/\b(?:not|no|cannot|isn[’']t)\s+(?:a\s+)?(?:fully\s+)?remote\b/i.test(description)
    && /\b(?:this\s+(?:is\s+a|position\s+is|role\s+(?:is|can\s+be)))\s+(?:either\s+hybrid\s+or\s+)?fully\s+remote\b/i.test(description)) {
    normalized = { ...normalized, remoteFlag: true, workLocation: "Remote" };
  }
  const range = job.salaryRange && typeof job.salaryRange === "object" ? job.salaryRange as Record<string, unknown> : undefined;
  if (job.salary || range?.disclosed === false || range?.min || range?.max) return normalized;
  const matches = [...description.matchAll(/(?:expected compensation|salary(?: range)?|pay range|compensation)\s*:\s*([^!?]{0,170}?)\$\s*(\d[\d,]*(?:\.\d+)?)\s*(?:to|–|—|-)\s*\$\s*(\d[\d,]*(?:\.\d+)?)([^!?]{0,100})/gi)];
  if (matches.length !== 1) return normalized;
  const [, before, low, high, after] = matches[0];
  const min = Number(low.replace(/,/g, "")), max = Number(high.replace(/,/g, ""));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return normalized;
  // A 35-hour work week does not mean an hourly pay rate. Never infer a period from magnitude.
  const period = /\bhourly\b/i.test(before) || /^\s*(?:per\s+hour|\/\s*h(?:ou)?r)\b/i.test(after) ? "Hourly"
    : /\bannual(?:ly)?\b/i.test(before) || /^\s*(?:per\s+(?:year|annum)|annually|\/\s*year)\b/i.test(after) ? "Annual" : "";
  const suffix = period === "Hourly" ? " / hour" : period === "Annual" ? " / year" : "";
  return { ...normalized, salary: `$${min.toLocaleString("en-CA")}–$${max.toLocaleString("en-CA")}${suffix}`, salaryRange: { ...range, min, max, ...(period ? { period } : {}) }, salaryMetadataSource: "explicit-description" };
}
