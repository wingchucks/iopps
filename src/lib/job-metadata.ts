type MetadataJob = { salary?: unknown; salaryRange?: unknown; description?: unknown };

/** Read-time enrichment only; never replace an employer's explicit compensation fields. */
export function normalizeJobDiscoveryMetadata<T extends MetadataJob>(job: T): T {
  const range = job.salaryRange && typeof job.salaryRange === "object"
    ? job.salaryRange as Record<string, unknown> : undefined;
  if (job.salary || range?.disclosed === false || range?.min || range?.max) return job;
  if (typeof job.description !== "string") return job;
  const description = job.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const matches = [...description.matchAll(
    /(?:expected compensation|salary|pay range|compensation)\s*:\s*[^.!?]{0,160}?\bhourly\b[^.!?]{0,100}?\$\s*(\d[\d,]*(?:\.\d+)?)\s*(?:to|–|-)\s*\$\s*(\d[\d,]*(?:\.\d+)?)/gi,
  )];
  if (matches.length !== 1) return job;
  const min = Number(matches[0][1].replace(/,/g, ""));
  const max = Number(matches[0][2].replace(/,/g, ""));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return job;
  return {
    ...job,
    salary: `$${min.toLocaleString("en-CA")}–$${max.toLocaleString("en-CA")} / hour`,
    salaryRange: { ...range, min, max, period: "Hourly" },
    salaryMetadataSource: "explicit-description",
  };
}
