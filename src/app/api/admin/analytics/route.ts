import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import type { AnalyticsSummaryMetric, AnalyticsSummaryResponse } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

type CounterMap = Record<string, number>;

function dateKeyForRegina(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Regina",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateKeys(days: number): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    return dateKeyForRegina(date);
  });
}

function decodeLabel(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function topItems(map: unknown, limit = 5): AnalyticsSummaryMetric[] {
  if (!map || typeof map !== "object") return [];
  return Object.entries(map as CounterMap)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label: decodeLabel(label), count }));
}

function mergeCounter(into: CounterMap, source: unknown) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source as CounterMap)) {
    if (typeof value === "number") into[key] = (into[key] || 0) + value;
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }
  const db = adminDb;

  const rangeParam = request.nextUrl.searchParams.get("range") || "7";
  const rangeDays = Math.min(Math.max(Number.parseInt(rangeParam, 10) || 7, 1), 90);
  const keys = dateKeys(rangeDays);

  try {
    const dayRefs = keys.map((key) => db.collection("analyticsDaily").doc(key));
    const [daySnaps, visitorCounts] = await Promise.all([
      db.getAll(...dayRefs),
      Promise.all(dayRefs.map((ref) => ref.collection("visitors").count().get())),
    ]);

    const totals = {
      visitors: 0,
      pageViews: 0,
      totalClicks: 0,
      outboundClicks: 0,
      applyClicks: 0,
    };
    const allEvents: CounterMap = {};
    const allPages: CounterMap = {};
    const allClicks: CounterMap = {};

    const days = daySnaps.map((snap, index) => {
      const data = snap.exists ? snap.data() || {} : {};
      const dayTotals = (data.totals || {}) as Record<string, number>;
      const visitors = visitorCounts[index].data().count || 0;
      const pageViews = dayTotals.pageViews || 0;
      const totalClicks = dayTotals.clicks || 0;
      const outboundClicks = dayTotals.outboundClicks || 0;
      const applyClicks = dayTotals.applyClicks || 0;

      totals.visitors += visitors;
      totals.pageViews += pageViews;
      totals.totalClicks += totalClicks;
      totals.outboundClicks += outboundClicks;
      totals.applyClicks += applyClicks;
      mergeCounter(allEvents, data.events);
      mergeCounter(allPages, data.pages);
      mergeCounter(allClicks, data.clicks);

      return {
        date: keys[index],
        visitors,
        pageViews,
        totalClicks,
        outboundClicks,
        applyClicks,
        topEvents: topItems(data.events, 5),
        topPages: topItems(data.pages, 5),
        topClicks: topItems(data.clicks, 5),
        sponsorLine: `IOPPS recorded ${pageViews.toLocaleString()} page views and ${totalClicks.toLocaleString()} tracked clicks on ${keys[index]}.`,
      };
    });

    const response: AnalyticsSummaryResponse = {
      rangeDays,
      generatedAt: new Date().toISOString(),
      totals,
      days,
      topEvents: topItems(allEvents, 8),
      topPages: topItems(allPages, 8),
      topClicks: topItems(allClicks, 8),
      sponsorLine: `IOPPS recorded ${totals.pageViews.toLocaleString()} page views, ${totals.totalClicks.toLocaleString()} tracked clicks, and ${totals.outboundClicks.toLocaleString()} outbound clicks in the last ${rangeDays} days.`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/admin/analytics] Error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
