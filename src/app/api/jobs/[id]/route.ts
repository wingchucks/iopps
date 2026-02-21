import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();
    const doc = await db.collection("jobs").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = doc.data()!;
    const job = serialize({ id: doc.id, ...data }) as Record<string, unknown>;

    // Normalize salary object to string
    if (job.salary && typeof job.salary === "object") {
      const salObj = job.salary as Record<string, unknown>;
      job.salary = salObj.display ? String(salObj.display) : "";
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error("Job detail API error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}
