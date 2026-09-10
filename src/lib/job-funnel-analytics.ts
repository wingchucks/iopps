export type JobFunnelEvent =
  | "job_search_results"
  | "job_detail_view"
  | "application_start"
  | "application_submitted"
  | "external_application_click";

export interface JobFunnelFields {
  jobId?: string;
  resultCount?: number;
}

const documentDedupe = new WeakMap<Window, string[]>();
const pendingEvents = new WeakMap<Window, Array<{event: JobFunnelEvent; fields: JobFunnelFields}>>();

/** Called only by the configured GA component once its script is ready. */
export function flushJobFunnelEvents(): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const pending = pendingEvents.get(window) || [];
  pendingEvents.delete(window);
  for (const item of pending) trackJobFunnelEvent(item.event, item.fields);
}

/**
 * Uses only the already-configured gtag; never initializes a tracker or calls an API.
 * Supply a public job document ID (not a user ID or free text). Search needs a count;
 * all other events need a job ID. Invalid/missing values are dropped.
 * Milestones dedupe the newest 200 event/job pairs per tab session (FIFO eviction).
 * Blocked storage falls back to document lifetime. External clicks are intentions,
 * never completed employer applications. Emit submitted only after API confirmation.
 */
export function trackJobFunnelEvent(event: JobFunnelEvent, fields: JobFunnelFields = {}): void {
  if (typeof window === "undefined") return;
  const browser = window as Window & { gtag?: (...args: unknown[]) => void };
  try {
    if (!["job_search_results", "job_detail_view", "application_start", "application_submitted", "external_application_click"].includes(event)) return;
    const params: Record<string, string | number> = {};
    if (event === "job_search_results") {
      if (!Number.isSafeInteger(fields.resultCount) || fields.resultCount! < 0) return;
      params.result_count = fields.resultCount!;
    } else {
      if (typeof fields.jobId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(fields.jobId)) return;
      params.job_id = fields.jobId;
    }
    if (typeof browser.gtag !== "function") {
      const safeFields = event === "job_search_results" ? {resultCount: fields.resultCount} : {jobId: fields.jobId};
      pendingEvents.set(browser, [...(pendingEvents.get(browser) || []), {event, fields: safeFields}].slice(-200));
      return;
    }
    const dedupeKey = event === "job_search_results" || event === "external_application_click"
      ? undefined : `${event}:${fields.jobId}`;
    let seen: string[] = documentDedupe.get(browser) ?? [];
    const storageKey = "iopps.job-funnel.v1";
    if (dedupeKey) {
      try {
        const raw = browser.sessionStorage.getItem(storageKey);
        const parsed: unknown = raw && raw.length <= 40000 ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) seen = [...new Set([...parsed.filter((key): key is string =>
          typeof key === "string" && /^(job_detail_view|application_start|application_submitted):[A-Za-z0-9_-]{1,128}$/.test(key)
        ), ...seen])].slice(-200);
      } catch { /* Storage is optional. */ }
      if (seen.includes(dedupeKey)) return;
    }
    browser.gtag("event", event, {
      ...params,
      page_location: "https://www.iopps.ca/jobs",
      page_title: "Jobs",
      page_referrer: "",
    });
    if (dedupeKey) {
      const next = [...seen, dedupeKey].slice(-200);
      documentDedupe.set(browser, next);
      try { browser.sessionStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { /* Storage is optional. */ }
    }
  } catch {
    // Analytics must never interrupt an application.
  }
}
