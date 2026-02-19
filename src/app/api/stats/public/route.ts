import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!adminDb) {
    return NextResponse.json({ members: 0, jobs: 0, organizations: 0, events: 0 });
  }

  try {
    const [usersSnap, jobsSnap, employersSnap, conferencesSnap] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("jobs").where("status", "==", "active").count().get(),
      adminDb.collection("employers").count().get(),
      adminDb.collection("conferences").count().get(),
    ]);

    return NextResponse.json(
      {
        members: usersSnap.data().count,
        jobs: jobsSnap.data().count,
        organizations: employersSnap.data().count,
        events: conferencesSnap.data().count,
      },
      { headers: { "Cache-Control": "public, s-maxage=300" } }
    );
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json({ members: 0, jobs: 0, organizations: 0, events: 0 });
  }
}
