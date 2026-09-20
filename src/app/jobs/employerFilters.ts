import type { Job } from "@/lib/firestore/jobs";

const cleanName = (name: string) => name.normalize("NFKC").replace(/[‘’ʼ]/g, "'").replace(/\s+/gu, " ").trim();
const displayName = (job: Job) => cleanName(job.employerName || job.orgName || job.companyName || "Hiring organization");

// Exact, reviewed identities only; never infer identity from acronyms or fuzzy names.
// FNHA: fnha.ca/contact-us identifies First Nations Health Authority (FNHA).
// SFNFCI: sfnfci.ca/training-support/training-policy uses the plural in its
// heading and the singular + Inc. for cheque payments to the same institute.
const FNHA = "First Nations Health Authority";
const SFNFCI = "Saskatchewan First Nations Family and Community Institute";
function knownName(name: string): string | undefined {
  if (/^(?:fnha|first nations health authority(?: ?\(fnha\))?)$/.test(name)) return FNHA;
  if (/^saskatchewan first nations? family and community institute(?: inc\.?)?$/.test(name)) return SFNFCI;
  return undefined;
}
export function canonicalEmployerName(name: string): string {
  const cleaned = cleanName(name).toLowerCase();
  return (knownName(cleaned) || cleaned).toLowerCase();
}
export type EmployerFilterOption = {
  value: string;
  label: string;
  employerIds: string[];
};
const ids = (job: Job) => [job.employerId, job.orgId].filter((id): id is string => Boolean(id));

/** Read-only projection: grouping filter choices never edits employer or job records. */
export function projectEmployerFilters(jobs: readonly Job[]): EmployerFilterOption[] {
  const groups = new Map<string, EmployerFilterOption>();
  for (const job of jobs) {
    const name = displayName(job);
    const value = canonicalEmployerName(name);
    let group = groups.get(value);
    if (!group) {
      group = { value, label: knownName(name.toLowerCase()) || name, employerIds: [] };
      groups.set(value, group);
    }
    for (const id of ids(job)) if (!group.employerIds.includes(id)) group.employerIds.push(id);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
export function matchesEmployerFilter(job: Job, selected: string, options: readonly EmployerFilterOption[]): boolean {
  if (!selected) return true;
  const value = canonicalEmployerName(selected);
  if (canonicalEmployerName(displayName(job)) === value) return true;
  const group = options.find(option => option.value === value);
  return Boolean(group && ids(job).some(id => group.employerIds.includes(id)));
}
