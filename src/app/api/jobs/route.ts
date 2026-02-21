import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60; // Cache for 60 seconds

// Recursively convert Firestore Timestamps and non-serializable values to JSON-safe types
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Firestore Timestamp (has toDate method)
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  // Plain objects
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }

  // Primitives (string, number, boolean)
  return value;
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("jobs")
      .where("active", "==", true)
      .get();

    const jobs = snap.docs.map((doc) => {
      const data = doc.data();
      const serialized = serialize({ id: doc.id, ...data }) as Record<string, unknown>;

      // Normalize salary: if stored as {display: "..."}, extract the string
      if (serialized.salary && typeof serialized.salary === "object") {
        const salObj = serialized.salary as Record<string, unknown>;
        serialized.salary = salObj.display ? String(salObj.display) : "";
      }

      return serialized;
    });

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err) {
    console.error("Jobs API error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
