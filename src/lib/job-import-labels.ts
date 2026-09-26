import type { Job } from "@/lib/firestore/jobs";
import { CANADIAN_PROVINCES, provinceCode } from "@/lib/canadian-provinces";

/** "$31.1" reads as a typo; amounts with cents show both digits. Nothing else is changed. */
export function formatListedMoney(label: string): string {
  return label.replace(/\$(\d{1,3}(?:,\d{3})+|\d+)\.(\d)(?![\d,]|\s*(?:k|m|million|billion)\b)/gi, (_, whole: string, tenth: string) => `$${whole}.${tenth}0`);
}

// Imported pay is displayed only from explicit canonical text, never synthesized
// from numeric aliases (whose currency/period may be absent or contradictory).
export function importedSalaryLabel(salary: unknown): string {
  if (typeof salary === "string") return formatListedMoney(salary.trim());
  if (!salary || typeof salary !== "object") return "";
  const record = salary as Record<string, unknown>;
  const label = [record.label, record.display, record.text].find(value => typeof value === "string" && value.trim()) as string | undefined;
  return label ? formatListedMoney(label.trim()) : "";
}

const PAY_PERIOD = /\b(?:hour|hourly|hr|year|yearly|annual|annually|annum|month|monthly|week|weekly|bi-?weekly|day|daily|shift)\b/i;

/** True when a pay amount is shown without saying what period it covers. */
export function payPeriodMissing(label: string): boolean {
  return /\$\s?\d/.test(label) && !PAY_PERIOD.test(label);
}

// Raw metadata availability includes aliases; consumers must supply their actual
// display availability so unseen alias values cannot suppress missing guidance.
// Only explicit feed provenance supports an import claim.
export function jobImportLabels(job: Pick<Job, "source" | "sourceMetadata" | "externalUrl" | "externalApplyUrl" | "applicationUrl">, displayed?: { pay: boolean; closing: boolean }) {
  const metadata = job.source === "feed" ? job.sourceMetadata : undefined;
  const sourceHref = [job.externalUrl, job.externalApplyUrl, job.applicationUrl].find(value => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  });
  // Say where to look, not how the listing was built; never guess the missing detail.
  const pay = metadata && (displayed ? !displayed.pay : metadata.salary === "not-imported") ? (sourceHref ? "Pay: see original posting" : "Pay not listed") : undefined;
  const closing = metadata && (displayed ? !displayed.closing : metadata.closingDate === "not-imported") ? (sourceHref ? "Closing date: see original posting" : "Closing date not listed") : undefined;
  return { pay, closing, sourceHref };
}

const COUNTRY = /^(?:ca|can|canada)$/i;

/**
 * One way to write a job's place: "Saskatoon, SK" rather than "Saskatoon, SK, CA" or
 * "Saskatoon, Saskatchewan, Canada". Repeated places are shown once, and a bare province
 * is dropped when a place in that province is listed. Nothing is added to the source text.
 */
export function displayJobLocation(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts = [record.city, record.province].filter((part): part is string => typeof part === "string" && Boolean(part.trim()));
    return [...(record.remote === true ? ["Remote"] : []), ...parts].join(", ");
  }
  if (typeof value !== "string") return "";
  const places: string[] = [];
  for (const entry of value.split(";")) {
    const segments = entry.split(",").map(part => part.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (segments.length > 1 && COUNTRY.test(segments[segments.length - 1])) segments.pop();
    const code = provinceCode(segments[segments.length - 1]);
    if (code) segments[segments.length - 1] = segments.length > 1 ? code : CANADIAN_PROVINCES.find(([key]) => key === code)![1];
    const place = segments.join(", ");
    if (place && !places.some(existing => existing.toLowerCase() === place.toLowerCase())) places.push(place);
  }
  return places.filter(place => {
    const code = provinceCode(place);
    return !code || !places.some(other => other !== place && other.toUpperCase().endsWith(`, ${code}`));
  }).join("; ");
}
