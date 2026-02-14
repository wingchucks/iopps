/**
 * Public Stats API - Real-time platform statistics for landing page
 * No authentication required
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        jobs: 50,
        members: 100,
        organizations: 20,
        events: 10,
        programs: 15,
      });
    }

    // Fetch counts in parallel - use correct collection names
    const [
      jobsSnap,
      usersSnap,
      employersSnap,
      powwowsSnap,
      conferencesSnap,
      communityEventsSnap,
      programsSnap,
    ] = await Promise.all([
      db.collection("jobs").where("active", "==", true).count().get(),
      db.collection("users").count().get(),
      db.collection("employers").where("status", "==", "approved").count().get(),
      db.collection("powwows").count().get(),
      db.collection("conferences").count().get(),
      db.collection("communityEvents").count().get().catch(() => ({ data: () => ({ count: 0 }) })),
      db.collection("programs").where("active", "==", true).count().get(),
    ]);

    // Calculate totals
    const totalEvents = 
      (powwowsSnap.data().count || 0) + 
      (conferencesSnap.data().count || 0) + 
      (communityEventsSnap.data().count || 0);

    const stats = {
      jobs: jobsSnap.data().count || 0,
      members: usersSnap.data().count || 0,
      organizations: employersSnap.data().count || 0,
      events: totalEvents,
      programs: programsSnap.data().count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching public stats:", error);
    // Return fallback stats on error
    return NextResponse.json({
      jobs: 50,
      members: 100,
      organizations: 20,
      events: 10,
      programs: 15,
    });
  }
}
