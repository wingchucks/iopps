import type { Job } from "./firestore/jobs";

export type EmployerBrand = { id: string; name?: string; employerId?: string; logoUrl?: string };
export const employerName = (job: Job) => job.employerName || job.orgName || job.companyName || "Hiring organization";
export const jobArea = (job: Job) => job.department || job.category || "";
const identity = (value?: string) => (value || "").trim().toLowerCase();
export function employerLogo(job: Job, brands: EmployerBrand[]): string | undefined {
  if (job.companyLogoUrl) return job.companyLogoUrl;
  const available = brands.filter(b => b.logoUrl);
  const exact = available.find(b => [job.employerId, job.orgId].filter(Boolean).some(id => b.id === id || b.employerId === id));
  if (exact) return exact.logoUrl;
  const named = available.filter(b => identity(b.name) === identity(employerName(job)));
  return named.length === 1 ? named[0].logoUrl : undefined;
}
let brandsRequest: Promise<EmployerBrand[]> | undefined;
export function loadEmployerBrands(): Promise<EmployerBrand[]> {
  if (!brandsRequest) brandsRequest = fetch("/api/organizations", { signal: AbortSignal.timeout(5000) }).then(async response => {
    if (!response.ok) throw new Error("Employer branding unavailable");
    return (await response.json()).orgs || [];
  }).catch(() => { brandsRequest = undefined; return []; });
  return brandsRequest;
}
export function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value && typeof value === "object" && "seconds" in value) return Number(value.seconds) * 1000;
  return 0;
}
export const addedAt = (job: Job) => timestamp(job.createdAt) || timestamp(job.postedAt) || timestamp(job.order);
export const closesAt = (job: Job) => timestamp(job.closingDate || job.expiresAt);
export function jobSummary(job: Job): string {
  let text = (job.description || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const summary = text.match(/(?:position summary|about (?:this|the) role|job summary)\s*:?\s*([\s\S]+)/i);
  if (summary) text = summary[1];
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= 240) return text;
  return text.slice(0, 240).replace(/\s+\S*$/, "") + "…";
}
export function salaryInfo(job: Job) {
  const range = job.salaryRange;
  if (range?.disclosed === false) return null;
  const text = job.salary || "";
  const unitText = `${range?.period || ""} ${text}`.toLowerCase();
  const period = /hour|\bhr\b/.test(unitText) ? "hour" : /annual|year|annum/.test(unitText) ? "year" : /month/.test(unitText) ? "month" : /week/.test(unitText) ? "week" : "unknown";
  const values = [range?.min, range?.max].filter((v): v is number => typeof v === "number" && v > 0);
  if (!values.length) {
    for (const match of text.matchAll(/(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*([kK])?/g)) {
      const value = Number(match[1].replace(/,/g, "")) * (match[2] ? 1000 : 1);
      if (value > 0) values.push(value);
    }
  }
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const suffix = period === "unknown" ? "" : ` / ${period}`;
  const display = text || `${range?.currency || "CAD"} $${min.toLocaleString()}${max !== min ? `–$${max.toLocaleString()}` : ""}${suffix}`;
  return { min, max, period, display };
}
export type DiscoveryFilters = { employer: string; area: string; added: string; closing: string; disclosed: string; training: string; salaryPeriod: string; salaryMin: string; salaryMax: string };
export function matchesDiscoveryFilters(job: Job, filters: DiscoveryFilters, now = Date.now()) {
  if (filters.employer && employerName(job) !== filters.employer) return false;
  if (filters.area && jobArea(job) !== filters.area) return false;
  const added = addedAt(job), closing = closesAt(job);
  if (filters.added && (!added || added < now - Number(filters.added) * 86400000)) return false;
  if (filters.closing === "1" && (!closing || closing < now || closing > now + 7 * 86400000)) return false;
  if (filters.training === "1" && job.willTrain !== true) return false;
  const salary = salaryInfo(job);
  if (filters.disclosed === "1" && !salary) return false;
  const min = filters.salaryMin.trim() ? Number(filters.salaryMin) : NaN;
  const max = filters.salaryMax.trim() ? Number(filters.salaryMax) : NaN;
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    if (!salary || salary.period !== filters.salaryPeriod) return false;
    if (!Number.isNaN(min) && salary.max < min) return false;
    if (!Number.isNaN(max) && salary.min > max) return false;
  }
  return true;
}
