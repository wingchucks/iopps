import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
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
    const snap = await db
      .collection("training_programs")
      .where("active", "==", true)
      .limit(500)
      .get();

    const programs = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
    return NextResponse.json({ programs });
  } catch (err) {
    console.error("Failed to fetch programs:", err);
    return NextResponse.json({ programs: [] }, { status: 500 });
  }
}