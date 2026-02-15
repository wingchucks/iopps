import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({
        jobs: 0,
        members: 0,
        organizations: 0,
        events: 0,
      });
    }

    const [
      jobsSnap,
      usersSnap,
      employersSnap,
      powwowsSnap,
      conferencesSnap,
      communityEventsSnap,
    ] = await Promise.all([
      adminDb.collection("jobs").where("active", "==", true).count().get(),
      adminDb.collection("users").count().get(),
      adminDb.collection("employers").where("status", "==", "approved").count().get(),
      adminDb.collection("powwows").count().get(),
      adminDb.collection("conferences").count().get(),
      adminDb
        .collection("communityEvents")
        .count()
        .get()
        .catch(() => ({ data: () => ({ count: 0 }) })),
    ]);

    const totalEvents =
      (powwowsSnap.data().count || 0) +
      (conferencesSnap.data().count || 0) +
      (communityEventsSnap.data().count || 0);

    return NextResponse.json({
      jobs: jobsSnap.data().count || 0,
      members: usersSnap.data().count || 0,
      organizations: employersSnap.data().count || 0,
      events: totalEvents,
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return NextResponse.json({
      jobs: 0,
      members: 0,
      organizations: 0,
      events: 0,
    });
  }
}
