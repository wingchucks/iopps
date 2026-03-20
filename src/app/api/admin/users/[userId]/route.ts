import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }


  const { userId } = await params;

  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Fetch member profile
    const profileDoc = await adminDb.collection("memberProfiles").doc(userId).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};

    // Count applications
    const appsSnap = await adminDb
      .collection("applications")
      .where("userId", "==", userId)
      .get();

    const applications = appsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        jobTitle: d.jobTitle || d.title || "Untitled",
        employer: d.employerName || d.company || "Unknown",
        status: d.status || "submitted",
        appliedAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
      };
    });

    return NextResponse.json({
      id: userId,
      email: userData.email || null,
      displayName: userData.displayName || profileData?.displayName || null,
      photoURL: userData.photoURL || profileData?.photoURL || null,
      role: userData.role || "member",
      status: userData.status || "active",
      suspendReason: userData.suspendReason || null,
      nation: profileData?.nation || profileData?.community || null,
      treatyArea: profileData?.treatyArea || profileData?.treaty || null,
      createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt || null,
      lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || userData.lastLoginAt || null,
      applications,
      applicationCount: applications.length,
      isSuperAdmin: userData.email === "nathan.arias@iopps.ca",
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { userId } = await params;
  const body = await request.json();

  try {
    // Super admin protection
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data()?.email === "nathan.arias@iopps.ca") {
      return NextResponse.json(
        { error: "Cannot modify super admin account" },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.role) {
      updates.role = body.role;
    }

    if (body.action === "suspend") {
      updates.status = "suspended";
      updates.suspendReason = body.reason || "No reason provided";
      updates.suspendedAt = new Date().toISOString();
    } else if (body.action === "unsuspend") {
      updates.status = "active";
      updates.suspendReason = null;
      updates.suspendedAt = null;
    }

    await adminDb.collection("users").doc(userId).update(updates);

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { userId } = await params;

  try {
    // Super admin protection
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data()?.email === "nathan.arias@iopps.ca") {
      return NextResponse.json(
        { error: "Cannot delete super admin account" },
        { status: 403 }
      );
    }

    // Soft delete
    await adminDb.collection("users").doc(userId).update({
      status: "deleted",
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
