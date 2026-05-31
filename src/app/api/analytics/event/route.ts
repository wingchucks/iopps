import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventPayload } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

const CLICK_EVENTS = new Set([
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

function safeKey(value: string | undefined, fallback: string): string {
  const cleaned = (value || fallback).replace(/^https?:\/\/[^/]+/i, "").trim() || fallback;
  return encodeURIComponent(cleaned.slice(0, 160)).replace(/\./g, "%2E");
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
  const dayRef = adminDb.collection("analyticsDaily").doc(dateKey);
  const visitorId = safeVisitorId(payload.visitorId);
  const path = safeText(payload.path, "/");
  const href = safeText(payload.href, "");
  const label = safeText(payload.label || payload.title || href || path, eventName);

  try {
    await dayRef.set(
      {
        date: dateKey,
        timezone: "America/Regina",
        updatedAt: FieldValue.serverTimestamp(),
        totals: {
          events: FieldValue.increment(1),
          pageViews: FieldValue.increment(eventName === "page_view" ? 1 : 0),
          clicks: FieldValue.increment(CLICK_EVENTS.has(eventName) ? 1 : 0),
          outboundClicks: FieldValue.increment(eventName === "outbound_link_click" ? 1 : 0),
          applyClicks: FieldValue.increment(eventName === "job_apply_click" ? 1 : 0),
        },
        events: {
          [eventName]: FieldValue.increment(1),
        },
        pages: {
          [safeKey(path, "/")]: FieldValue.increment(eventName === "page_view" ? 1 : 0),
        },
        clicks: {
          [safeKey(label || href, eventName)]: FieldValue.increment(CLICK_EVENTS.has(eventName) ? 1 : 0),
        },
      },
      { merge: true },
    );

    if (visitorId) {
      await dayRef.collection("visitors").doc(visitorId).set(
        {
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/analytics/event] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to record analytics event" }, { status: 500 });
  }
}
