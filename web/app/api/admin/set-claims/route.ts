import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";

/**
 * Set admin custom claims for a user
 * This endpoint allows setting the correct claim format that Firestore rules expect
 *
 * POST /api/admin/set-claims
 * Body: { targetUid?: string } - if not provided, sets claims for the requesting user
 *
 * Security: Only users with existing admin claim OR the super admin email can use this
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!auth) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    // Verify the requesting user's token
    const decodedToken = await auth.verifyIdToken(idToken);
    const requestingUserEmail = decodedToken.email;
    const requestingUid = decodedToken.uid;

    // Only allow super admin or users with existing admin claim
    const isSuperAdmin = requestingUserEmail === "nathan.arias@iopps.ca";
    const hasAdminClaim = decodedToken.admin === true;

    if (!isSuperAdmin && !hasAdminClaim) {
      return NextResponse.json(
        { error: "Only admins can set claims" },
        { status: 403 }
      );
    }

    // Get target user (default to self)
    const body = await request.json().catch(() => ({}));
    const targetUid = body.targetUid || requestingUid;

    // Get current user record
    const userRecord = await auth.getUser(targetUid);
    const currentClaims = userRecord.customClaims || {};

    // Set the admin claim in the correct format
    const newClaims = {
      ...currentClaims,
      admin: true,
      // Keep moderator if it was set
      moderator: currentClaims.moderator || false,
    };

    await auth.setCustomUserClaims(targetUid, newClaims);

    // Get updated user to confirm
    const updatedUser = await auth.getUser(targetUid);

    return NextResponse.json({
      success: true,
      message: "Admin claims set successfully",
      uid: targetUid,
      email: updatedUser.email,
      previousClaims: currentClaims,
      newClaims: updatedUser.customClaims,
      note: "User must sign out and back in, or refresh their token, for changes to take effect",
    });
  } catch (error) {
    console.error("Error setting claims:", error);
    return NextResponse.json(
      {
        error: "Failed to set claims",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
