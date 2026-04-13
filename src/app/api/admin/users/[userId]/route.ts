import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, verifySuperAdminToken } from "@/lib/api-auth";
import { adminDb, getAdminAuth } from "@/lib/firebase-admin";
import { isSuperAdminEmail } from "@/lib/server/super-admin";

export const dynamic = "force-dynamic";

export function buildAdminUserSoftDeleteUpdate(adminId: string, deletedAt: string) {
  return {
    status: "deleted",
    deletedAt,
    deletedBy: adminId,
    updatedAt: deletedAt,
  };
}

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
    const targetIsSuperAdmin = isSuperAdminEmail(userData.email);
    const viewerIsSuperAdmin = isSuperAdminEmail(
      auth.viewerEmail ?? auth.decodedToken.email ?? null,
    );

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
      isSuperAdmin: targetIsSuperAdmin,
      capabilities: {
        canDelete:
          viewerIsSuperAdmin &&
          !targetIsSuperAdmin &&
          userData.status !== "deleted",
      },
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
    if (userDoc.exists && isSuperAdminEmail(userDoc.data()?.email)) {
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
  const auth = await verifySuperAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { userId } = await params;

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (isSuperAdminEmail(userDoc.data()?.email)) {
      return NextResponse.json(
        { error: "Cannot delete super admin account" },
        { status: 403 }
      );
    }

    const deletedAt = new Date().toISOString();
    await userRef.set(
      buildAdminUserSoftDeleteUpdate(auth.decodedToken.uid, deletedAt),
      { merge: true },
    );

    try {
      const adminAuth = getAdminAuth();
      await adminAuth.updateUser(userId, { disabled: true });
      await adminAuth.revokeRefreshTokens(userId);
    } catch (error) {
      if (
        !(
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "auth/user-not-found"
        )
      ) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, userId, deletedAt });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
