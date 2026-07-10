import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import {
  mergeCounterMaps,
  topAnalyticsItems,
  type AnalyticsCounterMap,
} from "@/lib/analytics/storage";
import { readAnalyticsDay } from "@/lib/server/analytics-daily";
import type { AnalyticsSummaryResponse } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

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
    const analyticsDays = await Promise.all(keys.map((key) => readAnalyticsDay(db, key)));
    const totals = {
      visitors: 0,
      pageViews: 0,
      totalClicks: 0,
      outboundClicks: 0,
      applyClicks: 0,
    };
    let allEvents: AnalyticsCounterMap = {};
    let allPages: AnalyticsCounterMap = {};
    let allClicks: AnalyticsCounterMap = {};

    const days = analyticsDays.map((day, index) => {
      totals.visitors += day.visitors;
      totals.pageViews += day.totals.pageViews;
      totals.totalClicks += day.totals.clicks;
      totals.outboundClicks += day.totals.outboundClicks;
      totals.applyClicks += day.totals.applyClicks;
      allEvents = mergeCounterMaps(allEvents, day.events);
      allPages = mergeCounterMaps(allPages, day.pages);
      allClicks = mergeCounterMaps(allClicks, day.clicks);

      return {
        date: keys[index],
        visitors: day.visitors,
        pageViews: day.totals.pageViews,
        totalClicks: day.totals.clicks,
        outboundClicks: day.totals.outboundClicks,
        applyClicks: day.totals.applyClicks,
        topEvents: topAnalyticsItems(day.events, 5),
        topPages: topAnalyticsItems(day.pages, 5),
        topClicks: topAnalyticsItems(day.clicks, 5),
        sponsorLine: `IOPPS recorded ${day.totals.pageViews.toLocaleString()} page views and ${day.totals.clicks.toLocaleString()} tracked clicks on ${keys[index]}.`,
      };
    });

    const response: AnalyticsSummaryResponse = {
      rangeDays,
      generatedAt: new Date().toISOString(),
      totals,
      days,
      topEvents: topAnalyticsItems(allEvents, 8),
      topPages: topAnalyticsItems(allPages, 8),
      topClicks: topAnalyticsItems(allClicks, 8),
      sponsorLine: `IOPPS recorded ${totals.pageViews.toLocaleString()} page views, ${totals.totalClicks.toLocaleString()} tracked clicks, and ${totals.outboundClicks.toLocaleString()} outbound clicks in the last ${rangeDays} days.`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/admin/analytics] Error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
