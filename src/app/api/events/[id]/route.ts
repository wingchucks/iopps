import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isPublicEventVisible, normalizePublicEvent } from "@/lib/public-events";

export const runtime = "nodejs";
export const revalidate = 60;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    const direct = await db.collection("events").doc(id).get();
    if (direct.exists) {
      const event = normalizePublicEvent(
        serialize({ id: direct.id, ...direct.data() }) as Record<string, unknown>
      );
      if (isPublicEventVisible(event)) {
        return NextResponse.json({ event });
      }
    }

    const slugSnap = await db
      .collection("events")
      .where("slug", "==", id)
      .limit(1)
      .get();

    if (!slugSnap.empty) {
      const doc = slugSnap.docs[0];
      const event = normalizePublicEvent(
        serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>
      );
      if (isPublicEventVisible(event)) {
        return NextResponse.json({ event });
      }
    }

    return NextResponse.json({ event: null }, { status: 404 });
  } catch (error) {
    console.error("Event detail API error:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}
