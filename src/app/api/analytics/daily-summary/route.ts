import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { AnalyticsSummaryMetric } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

type CounterMap = Record<string, number>;

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

function decodeLabel(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function topItems(map: unknown, limit = 3): AnalyticsSummaryMetric[] {
  if (!map || typeof map !== "object") return [];
  return Object.entries(map as CounterMap)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label: decodeLabel(label), count }));
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
    const dayRef = adminDb.collection("analyticsDaily").doc(date);
    const [daySnap, visitorsSnap] = await Promise.all([
      dayRef.get(),
      dayRef.collection("visitors").count().get(),
    ]);

    const data = daySnap.exists ? daySnap.data() || {} : {};
    const totals = (data.totals || {}) as Record<string, number>;
    const visitors = visitorsSnap.data().count || 0;
    const pageViews = totals.pageViews || 0;
    const totalClicks = totals.clicks || 0;
    const outboundClicks = totals.outboundClicks || 0;
    const applyClicks = totals.applyClicks || 0;
    const topPages = topItems(data.pages);
    const topClicks = topItems(data.clicks);
    const sponsorLine = `IOPPS recorded ${formatNumber(pageViews)} page views, ${formatNumber(totalClicks)} tracked clicks, and ${formatNumber(outboundClicks)} outbound clicks on ${date}.`;

    const text = [
      `IOPPS Daily Stats — ${date}`,
      `- Visitors: ${formatNumber(visitors)}`,
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
      visitors,
      pageViews,
      totalClicks,
      outboundClicks,
      applyClicks,
      topPages,
      topClicks,
      sponsorLine,
      text,
    });
  } catch (error) {
    console.error("[GET /api/analytics/daily-summary] Error:", error);
    return NextResponse.json({ error: "Failed to load daily analytics summary" }, { status: 500 });
  }
}
