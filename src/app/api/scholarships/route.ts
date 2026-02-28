import { NextResponse } from "next/server";
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
    const snap = await db.collection("scholarships")
      .where("status", "==", "active")
      .get();

    const scholarships = snap.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ scholarships });
  } catch (err) {
    console.error("Scholarships API error:", err);
    return NextResponse.json({ error: "Failed to load scholarships" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status: newStatus, fromStatus } = body;

    if (!newStatus || !fromStatus) {
      return NextResponse.json({ error: "status and fromStatus required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("scholarships")
      .where("status", "==", fromStatus)
      .get();

    if (snap.empty) {
      return NextResponse.json({ updated: 0, message: `No scholarships with status '${fromStatus}'` });
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { status: newStatus }));
    await batch.commit();

    return NextResponse.json({ updated: snap.size, message: `Updated ${snap.size} from '${fromStatus}' to '${newStatus}'` });
  } catch (err) {
    console.error("Scholarships PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}