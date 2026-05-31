import type { AnalyticsEventName, AnalyticsEventPayload } from "./types";

const VISITOR_STORAGE_KEY = "iopps.analytics.visitorId";

function getVisitorId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;

    const generated =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function cleanText(value: string | null | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 140) : undefined;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  payload: Partial<AnalyticsEventPayload> = {},
): void {
  if (typeof window === "undefined") return;

  const body: AnalyticsEventPayload = {
    eventName,
    path: payload.path ?? `${window.location.pathname}${window.location.search}`,
    title: cleanText(payload.title ?? document.title),
    href: payload.href,
    label: cleanText(payload.label),
    referrer: payload.referrer ?? document.referrer,
    visitorId: payload.visitorId ?? getVisitorId(),
  };

  const serialized = JSON.stringify(body);

  if (navigator.sendBeacon) {
    const blob = new Blob([serialized], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/event", blob);
    return;
  }

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
    keepalive: true,
  }).catch(() => undefined);
}
