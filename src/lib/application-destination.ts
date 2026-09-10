import { normalizeExternalHref } from "./utils.ts";

export type ApplicationDestination = { kind: "internal" | "external" | "email" | "unavailable"; href: string; label: string };
/** Email-linked organizations retain the IOPPS application/inbox contract. */
export function resolveApplicationDestination(job: object, slug: string): ApplicationDestination {
  const record = job as Record<string, unknown>;
  const raw = record.applicationUrl || record.applicationLink || record.externalUrl || record.externalApplyUrl || "";
  const href = normalizeExternalHref(raw);
  const internal: ApplicationDestination = { kind: "internal", href: `/jobs/${encodeURIComponent(slug)}/apply`, label: "Apply on IOPPS" };
  if (!raw) return internal;
  if (/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?[^\r\n]*)?$/i.test(href)) {
    return record.orgId || record.employerId ? internal : { kind: "email", href, label: "Apply by email" };
  }
  try {
    const url = new URL(href);
    if (["http:", "https:"].includes(url.protocol) && url.hostname && !url.username && !url.password) {
      return { kind: "external", href: url.href, label: "Apply on employer site" };
    }
  } catch { /* Invalid destinations must not silently become internal submissions. */ }
  return { kind: "unavailable", href: "", label: "Application link unavailable" };
}
