import { getAppCheckTokenValue } from "@/lib/firebase";
import { analyticsPath, anonymousVisitorId } from "./privacy";
import type { AnalyticsEventName, AnalyticsEventPayload } from "./types";

function getAnonymousVisitorId(): string | undefined {
  try {
    const key = "iopps.analytics.visitorId";
    const existing = anonymousVisitorId(window.localStorage.getItem(key));
    if (existing) return existing;
    const generated = window.crypto.randomUUID();
    window.localStorage.setItem(key, generated);
    return generated;
  } catch { return undefined; }
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  payload: Partial<AnalyticsEventPayload> = {},
): void {
  if (typeof window === "undefined") return;
  // No free text/URLs or caller-supplied identities; only a random visitor UUID.
  const body: AnalyticsEventPayload = {
    eventName,
    path: analyticsPath(payload.path ?? window.location.pathname),
    visitorId: getAnonymousVisitorId(),
  };
  void (async () => {
    const appCheckToken = await getAppCheckTokenValue();
    if (!appCheckToken) return;
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Firebase-AppCheck": appCheckToken },
      body: JSON.stringify(body),
      keepalive: true,
    });
  })().catch(() => undefined);
}
