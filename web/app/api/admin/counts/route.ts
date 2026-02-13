import { NextRequest, NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function getCollectionCount(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  conditions?: { field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }[]
): Promise<number> {
  try {
    let ref: FirebaseFirestore.Query = db.collection(collectionName);
    if (conditions) {
      for (const c of conditions) {
        ref = ref.where(c.field, c.op, c.value);
      }
    }
    const snapshot = await ref.count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error("Error counting " + collectionName + ":", error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminToken(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { db } = initAdmin();
    if (!db) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 }
      );
    }

    // Query all counts in parallel using Admin SDK (bypasses security rules)
    const [
      totalUsers,
      totalMembers,
      totalEmployers,
      totalVendors,
      totalJobs,
      activeJobs,
      totalEvents,
      totalApplications,
      totalPowwows,
      totalFlags,
      pendingVerifications,
      pendingEmployers,
    ] = await Promise.all([
      getCollectionCount(db, "users"),
      getCollectionCount(db, "memberProfiles"),
      getCollectionCount(db, "employers"),
      getCollectionCount(db, "vendors"),
      getCollectionCount(db, "jobs"),
      getCollectionCount(db, "jobs", [{ field: "status", op: "==", value: "active" }]),
      getCollectionCount(db, "conferences"),
      getCollectionCount(db, "applications"),
      getCollectionCount(db, "powwows"),
      getCollectionCount(db, "contentFlags"),
      getCollectionCount(db, "verificationRequests", [{ field: "status", op: "==", value: "pending" }]),
      getCollectionCount(db, "employers", [{ field: "status", op: "==", value: "pending" }]),
    ]);

    return NextResponse.json({
      counts: {
        users: { total: totalUsers },
        members: { total: totalMembers },
        employers: { total: totalEmployers, pending: pendingEmployers },
        vendors: { total: totalVendors },
        jobs: { total: totalJobs, active: activeJobs },
        events: { total: totalEvents },
        applications: { total: totalApplications },
        powwows: { total: totalPowwows },
        flags: { total: totalFlags },
        verifications: { pending: pendingVerifications },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin counts API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin counts" },
      { status: 500 }
    );
  }
}
