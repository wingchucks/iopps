import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminAction =
  | "force_publish"
  | "force_unpublish"
  | "mark_expired"
  | "reopen"
  | "flag_spam"
  | "unflag_spam"
  | "delete"
  | "restore";

interface AdminActionRequest {
  action: AdminAction;
  reason?: string;
}

// POST /api/admin/scholarships/[scholarshipId]
// Perform admin actions on a scholarship with audit logging
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scholarshipId: string }> }
) {
  try {
    const { scholarshipId } = await params;

    if (!auth || !db) {
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
    const adminUserId = decodedToken.uid;

    // Check if user is admin or moderator
    const userDoc = await db.collection("users").doc(adminUserId).get();
    const userData = userDoc.data();
    const userRole = userData?.role;

    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json(
        { error: "Admin or moderator access required" },
        { status: 403 }
      );
    }

    // Get request body
    const body: AdminActionRequest = await req.json();
    const { action, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // Get current scholarship data for audit log
    const scholarshipRef = db.collection("scholarships").doc(scholarshipId);
    const scholarshipDoc = await scholarshipRef.get();

    if (!scholarshipDoc.exists) {
      return NextResponse.json(
        { error: "Scholarship not found" },
        { status: 404 }
      );
    }

    const beforeSnapshot = scholarshipDoc.data();
    let updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Process action
    switch (action) {
      case "force_publish":
        updateData = {
          ...updateData,
          active: true,
          expiredAt: null,
          expirationReason: null,
          "adminOverride.forcePublished": true,
          "adminOverride.forceUnpublished": false,
          "adminOverride.reopenedAt": FieldValue.serverTimestamp(),
          "adminOverride.reopenedBy": adminUserId,
        };
        break;

      case "force_unpublish":
        updateData = {
          ...updateData,
          active: false,
          "adminOverride.forceUnpublished": true,
          "adminOverride.forcePublished": false,
        };
        break;

      case "mark_expired":
        updateData = {
          ...updateData,
          active: false,
          expiredAt: FieldValue.serverTimestamp(),
          expirationReason: "admin_marked_expired",
          "adminOverride.forcePublished": false,
        };
        break;

      case "reopen":
        updateData = {
          ...updateData,
          active: true,
          expiredAt: null,
          expirationReason: null,
          "adminOverride.reopenedAt": FieldValue.serverTimestamp(),
          "adminOverride.reopenedBy": adminUserId,
        };
        break;

      case "flag_spam":
        updateData = {
          ...updateData,
          active: false,
          "adminOverride.flaggedAsSpam": true,
          "adminOverride.flaggedAt": FieldValue.serverTimestamp(),
          "adminOverride.flaggedBy": adminUserId,
        };
        break;

      case "unflag_spam":
        updateData = {
          ...updateData,
          "adminOverride.flaggedAsSpam": false,
          "adminOverride.flaggedAt": null,
          "adminOverride.flaggedBy": null,
        };
        break;

      case "delete":
        // Soft delete - set deletedAt timestamp
        updateData = {
          ...updateData,
          active: false,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: adminUserId,
        };
        break;

      case "restore":
        // Restore from soft delete
        updateData = {
          ...updateData,
          deletedAt: null,
          deletedBy: null,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update scholarship
    await scholarshipRef.update(updateData);

    // Get updated data for audit log
    const updatedDoc = await scholarshipRef.get();
    const afterSnapshot = updatedDoc.data();

    // Create audit log entry
    await db.collection("scholarshipAdminAuditLog").add({
      adminUserId,
      adminEmail: decodedToken.email || null,
      actionType: action,
      scholarshipId,
      timestamp: FieldValue.serverTimestamp(),
      reason: reason || null,
      beforeSnapshot: {
        active: beforeSnapshot?.active,
        expiredAt: beforeSnapshot?.expiredAt,
        adminOverride: beforeSnapshot?.adminOverride,
        deletedAt: beforeSnapshot?.deletedAt,
      },
      afterSnapshot: {
        active: afterSnapshot?.active,
        expiredAt: afterSnapshot?.expiredAt,
        adminOverride: afterSnapshot?.adminOverride,
        deletedAt: afterSnapshot?.deletedAt,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      scholarshipId,
      message: `Successfully performed ${action} on scholarship`,
    });
  } catch (error) {
    console.error("Error performing admin scholarship action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

// GET /api/admin/scholarships/[scholarshipId]
// Get scholarship details with audit history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scholarshipId: string }> }
) {
  try {
    const { scholarshipId } = await params;

    if (!auth || !db) {
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

    // Check if user is admin or moderator
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const userRole = userData?.role;

    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json(
        { error: "Admin or moderator access required" },
        { status: 403 }
      );
    }

    // Get scholarship
    const scholarshipDoc = await db
      .collection("scholarships")
      .doc(scholarshipId)
      .get();

    if (!scholarshipDoc.exists) {
      return NextResponse.json(
        { error: "Scholarship not found" },
        { status: 404 }
      );
    }

    // Get audit history
    const auditSnapshot = await db
      .collection("scholarshipAdminAuditLog")
      .where("scholarshipId", "==", scholarshipId)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const auditHistory = auditSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get click analytics count
    const clicksSnapshot = await db
      .collection("scholarshipApplyClicks")
      .where("scholarshipId", "==", scholarshipId)
      .count()
      .get();

    return NextResponse.json({
      scholarship: {
        id: scholarshipDoc.id,
        ...scholarshipDoc.data(),
      },
      auditHistory,
      analytics: {
        totalClicks: clicksSnapshot.data().count,
      },
    });
  } catch (error) {
    console.error("Error getting scholarship details:", error);
    return NextResponse.json(
      { error: "Failed to get scholarship details" },
      { status: 500 }
    );
  }
}
