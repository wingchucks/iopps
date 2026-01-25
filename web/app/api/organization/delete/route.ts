import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { softDeleteOrganization } from "@/lib/firestore/organizations";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/organization/delete
 *
 * Allows an employer to delete their own organization profile.
 * This is a soft delete that:
 * - Sets status to 'deleted'
 * - Sets directoryVisible to false
 * - Removes from directory_index
 * - Cascades soft delete to related content (jobs, conferences, scholarships)
 */
export async function DELETE(req: NextRequest) {
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

    // Get request body (optional reason)
    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    // Find the employer profile for this user
    // First try by document ID (userId)
    let employerId = userId;
    let employerDoc = await db.collection("employers").doc(userId).get();

    // If not found by ID, search by userId field
    if (!employerDoc.exists) {
      const querySnapshot = await db
        .collection("employers")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return NextResponse.json(
          { error: "No organization profile found for your account" },
          { status: 404 }
        );
      }

      employerDoc = querySnapshot.docs[0];
      employerId = employerDoc.id;
    }

    const employerData = employerDoc.data();

    // Verify ownership
    if (employerData?.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own organization" },
        { status: 403 }
      );
    }

    // Check if already deleted
    if (employerData?.status === "deleted") {
      return NextResponse.json(
        { error: "Organization has already been deleted" },
        { status: 400 }
      );
    }

    console.log(`[DELETE-ORG] User ${userId} requesting deletion of employer ${employerId}`);

    // Soft delete the organization using shared function
    const deleteResult = await softDeleteOrganization(employerId, userId, reason);

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || "Failed to delete organization" },
        { status: 400 }
      );
    }

    // Cascade soft delete to related collections
    const cascadeResults: Record<string, number> = {};
    const relatedCollections = [
      { collection: "jobs", field: "employerId" },
      { collection: "conferences", field: "employerId" },
      { collection: "scholarships", field: "employerId" },
      { collection: "powwows", field: "employerId" },
    ];

    for (const { collection, field } of relatedCollections) {
      try {
        const snapshot = await db
          .collection(collection)
          .where(field, "==", employerId)
          .get();

        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
              deletedAt: FieldValue.serverTimestamp(),
              deletedBy: userId,
              active: false,
            });
          });
          await batch.commit();
          cascadeResults[collection] = snapshot.size;
        } else {
          cascadeResults[collection] = 0;
        }
      } catch (error) {
        console.error(`Error cascading delete to ${collection}:`, error);
        cascadeResults[collection] = -1;
      }
    }

    // Create audit log
    try {
      await db.collection("audit_logs").add({
        action: "employer_self_delete",
        userId,
        employerId,
        employerName: deleteResult.organizationName,
        reason: reason || null,
        cascadeResults,
        timestamp: new Date(),
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    console.log(
      `[DELETE-ORG] User ${userId} successfully deleted organization "${deleteResult.organizationName}"`
    );

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
      organizationName: deleteResult.organizationName,
      cascadeResults,
    });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
