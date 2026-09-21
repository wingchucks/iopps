import type { Job } from "@/lib/firestore/jobs";

// Imported pay is displayed only from explicit canonical text, never synthesized
// from numeric aliases (whose currency/period may be absent or contradictory).
export function importedSalaryLabel(salary: unknown): string {
  if (typeof salary === "string") return salary.trim();
  if (!salary || typeof salary !== "object") return "";
  const record = salary as Record<string, unknown>;
  return [record.label, record.display, record.text].find(value => typeof value === "string" && value.trim()) as string || "";
}

// Raw metadata availability includes aliases; consumers must supply their actual
// display availability so unseen alias values cannot suppress missing guidance.
// Only explicit feed provenance supports an import claim.
export function jobImportLabels(job: Pick<Job, "source" | "sourceMetadata" | "externalUrl" | "externalApplyUrl" | "applicationUrl">, displayed?: { pay: boolean; closing: boolean }) {
  const metadata = job.source === "feed" ? job.sourceMetadata : undefined;
  const pay = metadata && (displayed ? !displayed.pay : metadata.salary === "not-imported") ? "Pay not imported" : undefined;
  const closing = metadata && (displayed ? !displayed.closing : metadata.closingDate === "not-imported") ? "Closing details not imported" : undefined;
  const sourceHref = [job.externalUrl, job.externalApplyUrl, job.applicationUrl].find(value => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  });
  return { pay, closing, sourceHref };
}
