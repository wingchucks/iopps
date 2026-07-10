import type { Firestore } from "firebase-admin/firestore";
import { mergeCounterMaps, type AnalyticsCounterMap } from "@/lib/analytics/storage";

export interface AnalyticsDayData {
  totals: {
    events: number;
    pageViews: number;
    clicks: number;
    outboundClicks: number;
    applyClicks: number;
  };
  events: AnalyticsCounterMap;
  pages: AnalyticsCounterMap;
  clicks: AnalyticsCounterMap;
  visitors: number;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mergeTotals(legacy: Record<string, unknown>, current: Record<string, unknown>) {
  return {
    events: numberValue(legacy.events) + numberValue(current.events),
    pageViews: numberValue(legacy.pageViews) + numberValue(current.pageViews),
    clicks: numberValue(legacy.clicks) + numberValue(current.clicks),
    outboundClicks: numberValue(legacy.outboundClicks) + numberValue(current.outboundClicks),
    applyClicks: numberValue(legacy.applyClicks) + numberValue(current.applyClicks),
  };
}

export async function readAnalyticsDay(db: Firestore, date: string): Promise<AnalyticsDayData> {
  const legacyRef = db.collection("analyticsDaily").doc(date);
  const currentRef = db.collection("analyticsDailyV2").doc(date);
  const [legacySnap, currentSnap, visitorsSnap, metricsSnap] = await Promise.all([
    legacyRef.get(),
    currentRef.get(),
    legacyRef.collection("visitors").count().get(),
    currentRef.collection("metrics").get(),
  ]);

  const legacy = legacySnap.exists ? legacySnap.data() || {} : {};
  const current = currentSnap.exists ? currentSnap.data() || {} : {};
  const metricPages: AnalyticsCounterMap = {};
  const metricClicks: AnalyticsCounterMap = {};

  for (const metric of metricsSnap.docs) {
    const data = metric.data();
    const kind = data.kind;
    const label = typeof data.label === "string" ? data.label.trim() : "";
    const count = numberValue(data.count);
    if (!label || count <= 0) continue;
    if (kind === "page") metricPages[label] = (metricPages[label] || 0) + count;
    if (kind === "click") metricClicks[label] = (metricClicks[label] || 0) + count;
  }

  return {
    totals: mergeTotals(
      (legacy.totals || {}) as Record<string, unknown>,
      (current.totals || {}) as Record<string, unknown>,
    ),
    events: mergeCounterMaps(legacy.events, current.events),
    pages: mergeCounterMaps(legacy.pages, metricPages),
    clicks: mergeCounterMaps(legacy.clicks, metricClicks),
    visitors: visitorsSnap.data().count || 0,
  };
}
