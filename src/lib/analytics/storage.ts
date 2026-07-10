import type { AnalyticsEventName, AnalyticsSummaryMetric } from "./types";

export type AnalyticsCounterMap = Record<string, number>;
export type AnalyticsMetricKind = "page" | "click";

const CLICK_EVENTS = new Set<AnalyticsEventName>([
  "cta_click",
  "internal_link_click",
  "outbound_link_click",
  "job_apply_click",
  "job_detail_click",
  "event_detail_click",
  "scholarship_detail_click",
  "training_detail_click",
  "employer_profile_click",
]);

export interface AnalyticsDeltas {
  events: number;
  pageViews: number;
  clicks: number;
  outboundClicks: number;
  applyClicks: number;
}

export function buildAnalyticsDeltas(eventName: AnalyticsEventName): AnalyticsDeltas {
  return {
    events: 1,
    pageViews: eventName === "page_view" ? 1 : 0,
    clicks: CLICK_EVENTS.has(eventName) ? 1 : 0,
    outboundClicks: eventName === "outbound_link_click" ? 1 : 0,
    applyClicks: eventName === "job_apply_click" ? 1 : 0,
  };
}

export function isTrackedClick(eventName: AnalyticsEventName): boolean {
  return CLICK_EVENTS.has(eventName);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function buildMetricDocumentId(kind: AnalyticsMetricKind, label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim() || "unknown";
  const encoded = encodeURIComponent(normalized).replace(/\./g, "%2E");
  const bounded = encoded.length > 220 ? `${encoded.slice(0, 210)}_${fnv1a(encoded)}` : encoded;
  return `${kind}_${bounded}`;
}

export function mergeCounterMaps(...sources: unknown[]): AnalyticsCounterMap {
  const merged: AnalyticsCounterMap = {};
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source as AnalyticsCounterMap)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        merged[key] = (merged[key] || 0) + value;
      }
    }
  }
  return merged;
}

function decodeLabel(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function topAnalyticsItems(map: unknown, limit = 5): AnalyticsSummaryMetric[] {
  return Object.entries(mergeCounterMaps(map))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label: decodeLabel(label), count }));
}
