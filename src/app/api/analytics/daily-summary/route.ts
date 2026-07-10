import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { topAnalyticsItems } from "@/lib/analytics/storage";
import { readAnalyticsDay } from "@/lib/server/analytics-daily";
import type { AnalyticsSummaryMetric } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

function normalizeSecret(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

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

function formatNumber(value: number): string {
  return value.toLocaleString("en-CA");
}

function formatTop(items: AnalyticsSummaryMetric[], fallback: string): string {
  if (items.length === 0) return fallback;
  return items.map((item) => `${item.label} (${formatNumber(item.count)})`).join(", ");
}

export async function GET(request: NextRequest) {
  const configuredSecret = normalizeSecret(process.env.IOPPS_ANALYTICS_CRON_SECRET);
  const providedSecret = normalizeSecret(
    request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret"),
  );

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const date = request.nextUrl.searchParams.get("date") || dateKeyForRegina();

  try {
    const day = await readAnalyticsDay(adminDb, date);
    const { pageViews, clicks: totalClicks, outboundClicks, applyClicks } = day.totals;
    const topPages = topAnalyticsItems(day.pages, 3);
    const topClicks = topAnalyticsItems(day.clicks, 3);
    const sponsorLine = `IOPPS recorded ${formatNumber(pageViews)} page views, ${formatNumber(totalClicks)} tracked clicks, and ${formatNumber(outboundClicks)} outbound clicks on ${date}.`;

    const text = [
      `IOPPS Daily Stats — ${date}`,
      `- Visitors: ${formatNumber(day.visitors)}`,
      `- Page views: ${formatNumber(pageViews)}`,
      `- Tracked clicks: ${formatNumber(totalClicks)}`,
      `- Outbound clicks: ${formatNumber(outboundClicks)}`,
      `- Apply clicks: ${formatNumber(applyClicks)}`,
      `- Top pages: ${formatTop(topPages, "Not enough data yet")}`,
      `- Top clicks: ${formatTop(topClicks, "Not enough data yet")}`,
      `- Sponsor line: ${sponsorLine}`,
    ].join("\n");

    return NextResponse.json({
      date,
      visitors: day.visitors,
      pageViews,
      totalClicks,
      outboundClicks,
      applyClicks,
      topPages,
      topClicks,
      sponsorLine,
      text,
      schemaVersion: 2,
    });
  } catch (error) {
    console.error("[GET /api/analytics/daily-summary] Error:", error);
    return NextResponse.json({ error: "Failed to load daily analytics summary" }, { status: 500 });
  }
}
