import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("events")
      .orderBy("order", "asc")
      .get();

    const events = snap.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ events });
  } catch (err) {
    console.error("Events API error:", err);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const data = await request.json();
    const { id, ...rest } = data;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.collection("events").doc(id).set({ id, ...rest }, { merge: true });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Events POST error:", err);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }
}