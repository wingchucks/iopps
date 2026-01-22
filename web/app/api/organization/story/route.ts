import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PUT /api/organization/story
 *
 * Updates the story field for an organization.
 * Only the org owner or admin can update.
 */
export async function PUT(req: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!auth || !db) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get request body
    const body = await req.json();
    const { orgId, story } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    if (typeof story !== "string") {
      return NextResponse.json(
        { error: "Story must be a string" },
        { status: 400 }
      );
    }

    // Verify the organization exists and user has permission
    const employerDoc = await db.collection("employers").doc(orgId).get();

    if (!employerDoc.exists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const employerData = employerDoc.data();

    // Check if user is owner or admin
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const isAdmin = userData?.role === "admin";
    const isOwner = employerData?.userId === userId;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to edit this organization" },
        { status: 403 }
      );
    }

    // Update the story
    await db.collection("employers").doc(orgId).update({
      story: story.trim(),
      storyUpdatedAt: FieldValue.serverTimestamp(),
      storyUpdatedBy: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(
      `[STORY] User ${userId} updated story for org ${orgId} (${employerData?.organizationName})`
    );

    return NextResponse.json({
      success: true,
      message: "Story updated successfully",
    });
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
