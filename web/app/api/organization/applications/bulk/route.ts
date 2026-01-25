import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";
import type { ApplicationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST - Bulk update application statuses
export async function POST(request: NextRequest) {
  // Rate limiting for bulk operations
  const rateLimitResult = rateLimiters.bulk(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const employerId = decodedToken.uid;

    const body = await request.json();
    const { applicationIds, status } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: "applicationIds array is required" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const validStatuses: ApplicationStatus[] = [
      "submitted",
      "reviewed",
      "shortlisted",
      "rejected",
      "hired",
      "withdrawn",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Limit bulk operations to 100 at a time
    if (applicationIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 applications per bulk operation" },
        { status: 400 }
      );
    }

    // Verify all applications belong to this employer and update them
    const batch = db.batch();
    const results = { updated: 0, failed: 0, errors: [] as string[] };

    for (const appId of applicationIds) {
      try {
        const appRef = db.collection("applications").doc(appId);
        const appDoc = await appRef.get();

        if (!appDoc.exists) {
          results.failed++;
          results.errors.push(`Application ${appId} not found`);
          continue;
        }

        const appData = appDoc.data();
        if (appData?.employerId !== employerId) {
          results.failed++;
          results.errors.push(`Not authorized to update application ${appId}`);
          continue;
        }

        batch.update(appRef, {
          status,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.updated++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${appId}`);
      }
    }

    if (results.updated > 0) {
      await batch.commit();
    }

    // Create notifications for updated applications
    if (results.updated > 0) {
      // Get updated applications to send notifications
      const notificationBatch = db.batch();
      for (const appId of applicationIds) {
        try {
          const appRef = db.collection("applications").doc(appId);
          const appDoc = await appRef.get();
          if (!appDoc.exists) continue;

          const appData = appDoc.data();
          if (appData?.employerId !== employerId) continue;

          // Create notification for applicant
          const notificationRef = db.collection("notifications").doc();
          notificationBatch.set(notificationRef, {
            userId: appData.memberId,
            type: "application_status",
            title: "Application Status Updated",
            message: `Your application status has been updated to: ${status}`,
            relatedEntityType: "application",
            relatedEntityId: appId,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch {
          // Continue with other notifications
        }
      }

      try {
        await notificationBatch.commit();
      } catch {
        // Notifications are non-critical
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return NextResponse.json(
      { error: "Failed to update applications" },
      { status: 500 }
    );
  }
}
