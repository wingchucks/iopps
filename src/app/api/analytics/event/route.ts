import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildAnalyticsDeltas,
  buildMetricDocumentId,
  isTrackedClick,
} from "@/lib/analytics/storage";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventPayload } from "@/lib/analytics/types";
import { verifyRequiredAppCheckFromRequest } from "@/lib/server/app-check";

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

function safeText(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 180) : fallback;
}

function safeVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return cleaned || null;
}

export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: "Firestore not initialized" }, { status: 500 });
  }

  const appCheckValid = await verifyRequiredAppCheckFromRequest(request);
  if (!appCheckValid) {
    return NextResponse.json({ ok: false, error: "Security check failed" }, { status: 403 });
  }

  let payload: Partial<AnalyticsEventPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.eventName;
  if (!eventName || !ANALYTICS_EVENT_NAMES.includes(eventName)) {
    return NextResponse.json({ ok: false, error: "Invalid analytics event" }, { status: 400 });
  }

  const dateKey = dateKeyForRegina();
  // V1 stored every page/click label as a dynamic map on one document and hit
  // Firestore's 1 MiB document limit. V2 keeps only fixed-cardinality totals on
  // the day document and moves unbounded labels to metric documents.
  const dayRef = adminDb.collection("analyticsDailyV2").doc(dateKey);
  const legacyDayRef = adminDb.collection("analyticsDaily").doc(dateKey);
  const visitorId = safeVisitorId(payload.visitorId);
  const path = safeText(payload.path, "/");
  const href = safeText(payload.href, "");
  const label = safeText(payload.label || payload.title || href || path, eventName);
  const deltas = buildAnalyticsDeltas(eventName);

  try {
    const batch = adminDb.batch();
    batch.set(
      dayRef,
      {
        date: dateKey,
        timezone: "America/Regina",
        schemaVersion: 2,
        updatedAt: FieldValue.serverTimestamp(),
        totals: {
          events: FieldValue.increment(deltas.events),
          pageViews: FieldValue.increment(deltas.pageViews),
          clicks: FieldValue.increment(deltas.clicks),
          outboundClicks: FieldValue.increment(deltas.outboundClicks),
          applyClicks: FieldValue.increment(deltas.applyClicks),
        },
        events: {
          [eventName]: FieldValue.increment(1),
        },
      },
      { merge: true },
    );

    if (eventName === "page_view") {
      batch.set(
        dayRef.collection("metrics").doc(buildMetricDocumentId("page", path)),
        {
          kind: "page",
          label: path,
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (isTrackedClick(eventName)) {
      const clickLabel = label || href || eventName;
      batch.set(
        dayRef.collection("metrics").doc(buildMetricDocumentId("click", clickLabel)),
        {
          kind: "click",
          label: clickLabel,
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (visitorId) {
      // Keep the original visitor subcollection as the single source of truth so
      // the transition does not double-count people who visit before and after V2.
      batch.set(
        legacyDayRef.collection("visitors").doc(visitorId),
        {
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
    return NextResponse.json({ ok: true, schemaVersion: 2 });
  } catch (error) {
    console.error("[POST /api/analytics/event] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to record analytics event" }, { status: 500 });
  }
}
