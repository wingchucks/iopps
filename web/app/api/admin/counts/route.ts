import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/counts
// ---------------------------------------------------------------------------

/**
 * Returns aggregate KPI counts across all major platform collections.
 *
 * All counts are fetched in parallel using Firestore `.count()` aggregation
 * for efficiency -- no documents are actually downloaded.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const [
      usersSnap,
      memberProfilesSnap,
      employersTotalSnap,
      employersPendingSnap,
      vendorsSnap,
      jobsTotalSnap,
      jobsActiveSnap,
      conferencesSnap,
      applicationsSnap,
      powwowsSnap,
      contentFlagsSnap,
      verificationsPendingSnap,
    ] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("memberProfiles").count().get(),
      adminDb.collection("employers").count().get(),
      adminDb
        .collection("employers")
        .where("status", "==", "pending")
        .count()
        .get(),
      adminDb.collection("vendors").count().get(),
      adminDb.collection("jobs").count().get(),
      adminDb
        .collection("jobs")
        .where("status", "==", "active")
        .count()
        .get(),
      adminDb.collection("conferences").count().get(),
      adminDb.collection("applications").count().get(),
      adminDb.collection("powwows").count().get(),
      adminDb.collection("contentFlags").count().get(),
      adminDb
        .collection("verificationRequests")
        .where("status", "==", "pending")
        .count()
        .get(),
    ]);

    const counts = {
      users: usersSnap.data().count,
      memberProfiles: memberProfilesSnap.data().count,
      employers: {
        total: employersTotalSnap.data().count,
        pending: employersPendingSnap.data().count,
      },
      vendors: vendorsSnap.data().count,
      jobs: {
        total: jobsTotalSnap.data().count,
        active: jobsActiveSnap.data().count,
      },
      conferences: conferencesSnap.data().count,
      applications: applicationsSnap.data().count,
      powwows: powwowsSnap.data().count,
      contentFlags: contentFlagsSnap.data().count,
      verificationRequests: {
        pending: verificationsPendingSnap.data().count,
      },
    };

    return NextResponse.json({
      counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/admin/counts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
