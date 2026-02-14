import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { recomputeOrganizationVisibility } from "@/lib/firestore/visibility";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/visibility/recompute
 *
 * Triggers visibility recomputation for an organization.
 * Call this after job publish, archive, featured toggle, or delete.
 *
 * Request body:
 * - orgId: string - The organization ID to recompute
 *
 * Authentication: Required (must be org owner or admin)
 */
export async function POST(request: NextRequest) {
  // Check Firebase Admin initialization
  if (!db || !auth) {
    console.error("[visibility/recompute] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  // Verify authentication
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(token);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 }
    );
  }

  const userId = decodedToken.uid;
  const isAdmin = decodedToken.admin === true;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { orgId } = body;

  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json(
      { error: "orgId is required" },
      { status: 400 }
    );
  }

  // Verify authorization: must be org owner, team member, or admin
  if (!isAdmin) {
    try {
      const orgDoc = await db.collection("employers").doc(orgId).get();
      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data()!;
      const isOwner = orgData.userId === userId || orgDoc.id === userId;

      // Check team membership
      const isTeamMember =
        Array.isArray(orgData.teamMembers) &&
        orgData.teamMembers.some(
          (member: { id: string }) => member.id === userId
        );

      if (!isOwner && !isTeamMember) {
        return NextResponse.json(
          { error: "Not authorized to manage this organization" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("[visibility/recompute] Authorization check error:", error);
      return NextResponse.json(
        { error: "Authorization check failed" },
        { status: 500 }
      );
    }
  }

  // Recompute visibility
  try {
    const result = await recomputeOrganizationVisibility(orgId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        orgId,
        isDirectoryVisible: result.isDirectoryVisible,
        visibilityReason: result.visibilityReason,
        directoryVisibleUntil: result.directoryVisibleUntil?.toISOString() || null,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to recompute visibility",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[visibility/recompute] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to recompute visibility",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
