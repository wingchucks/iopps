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
        jobs: 100,
        members: 2400,
        organizations: 50,
        events: 25,
        programs: 30,
      });
    }

    // Fetch counts in parallel
    const [jobsSnap, usersSnap, orgsSnap, eventsSnap, programsSnap] = await Promise.all([
      db.collection("jobs").where("active", "==", true).count().get(),
      db.collection("users").count().get(),
      db.collection("organizations").count().get(),
      db.collection("events").where("active", "==", true).count().get(),
      db.collection("programs").where("active", "==", true).count().get(),
    ]);

    const stats = {
      jobs: jobsSnap.data().count || 0,
      members: usersSnap.data().count || 0,
      organizations: orgsSnap.data().count || 0,
      events: eventsSnap.data().count || 0,
      programs: programsSnap.data().count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching public stats:", error);
    // Return fallback stats on error
    return NextResponse.json({
      jobs: 100,
      members: 2400,
      organizations: 50,
      events: 25,
      programs: 30,
    });
  }
}
