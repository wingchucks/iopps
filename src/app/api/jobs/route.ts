import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("jobs")
      .where("active", "==", true)
      .get();

    const jobs = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Serialize Firestore Timestamps to ISO strings
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? doc.data().createdAt ?? null,
      postedAt: doc.data().postedAt?.toDate?.()?.toISOString() ?? doc.data().postedAt ?? null,
      expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() ?? doc.data().expiresAt ?? null,
    }));

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err) {
    console.error("Jobs API error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
