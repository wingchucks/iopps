import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;

  try {
    const employerDoc = await adminDb.collection("employers").doc(orgId).get();
    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const employer = { id: employerDoc.id, ...employerDoc.data() };

    // Get team members
    const usersSnap = await adminDb
      .collection("users")
      .where("employerId", "==", orgId)
      .get();
    const team = usersSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.data().displayName || "Unknown",
      email: doc.data().email || "",
      role: doc.data().orgRole || "member",
      avatar: doc.data().photoURL || null,
    }));

    // Count jobs
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("employerId", "==", orgId)
      .get();
    const jobCount = jobsSnap.size;

    // Count applications across all jobs
    let applicationCount = 0;
    for (const jobDoc of jobsSnap.docs) {
      const appsSnap = await adminDb
        .collection("applications")
        .where("jobId", "==", jobDoc.id)
        .get();
      applicationCount += appsSnap.size;
    }

    // Get action history
    const historySnap = await adminDb
      .collection("employers")
      .doc(orgId)
      .collection("actionHistory")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();
    const actionHistory = historySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      employer,
      team,
      stats: {
        jobsPosted: jobCount,
        applicationsReceived: applicationCount,
        profileViews: (employerDoc.data() as Record<string, unknown>)?.profileViews || 0,
      },
      actionHistory,
    });
  } catch (error) {
    console.error("Error fetching employer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;
  const body = await request.json();

  try {
    const updateData: Record<string, unknown> = {};

    if (body.verified !== undefined) {
      updateData.verified = body.verified;
      updateData.verificationStatus = body.verified ? "verified" : "unverified";
    }
    if (body.disabled !== undefined) {
      updateData.disabled = body.disabled;
      updateData.status = body.disabled ? "disabled" : "active";
    }
    if (body.plan) {
      updateData.plan = body.plan;
    }

    updateData.updatedAt = new Date().toISOString();

    await adminDb.collection("employers").doc(orgId).update(updateData);

    // Log action
    await adminDb
      .collection("employers")
      .doc(orgId)
      .collection("actionHistory")
      .add({
        action: Object.keys(body).join(", "),
        details: body,
        adminId: auth.decodedToken.uid,
        timestamp: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating employer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
