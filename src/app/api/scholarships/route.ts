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
