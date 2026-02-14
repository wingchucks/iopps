import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This endpoint is called by Vercel Cron to publish scheduled jobs
// Runs every 15 minutes (configured in vercel.json)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED in all environments
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const now = new Date();
    let publishedCount = 0;
    const errors: string[] = [];

    // Find jobs that are:
    // 1. Not active (draft/scheduled)
    // 2. Have a scheduledPublishAt date in the past
    // 3. Have paid status or free posting enabled
    const scheduledJobsSnapshot = await db
      .collection("jobs")
      .where("active", "==", false)
      .where("scheduledPublishAt", "<=", now)
      .get();

    if (scheduledJobsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No scheduled jobs to publish",
        publishedCount: 0,
      });
    }

    const batch = db.batch();

    for (const doc of scheduledJobsSnapshot.docs) {
      try {
        const jobData = doc.data();

        // Verify the job can be published (paid or free posting)
        const canPublish =
          jobData.paymentStatus === "paid" ||
          jobData.freePostingEnabled === true;

        if (!canPublish) {
          // Check if employer has free posting grant
          const employerDoc = await db
            .collection("employers")
            .doc(jobData.employerId)
            .get();

          if (employerDoc.exists) {
            const employerData = employerDoc.data();
            const hasFreePosting =
              employerData?.freePostingEnabled ||
              (employerData?.freePostingGrant?.active &&
                employerData?.freePostingGrant?.remainingCredits > 0);

            if (!hasFreePosting) {
              errors.push(
                `Job ${doc.id} cannot be published: no payment or free posting`
              );
              continue;
            }
          }
        }

        // Publish the job
        batch.update(doc.ref, {
          active: true,
          publishedAt: FieldValue.serverTimestamp(),
          scheduledPublishAt: null, // Clear the scheduled date
        });

        publishedCount++;

        // Create notification for employer
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: jobData.employerId,
          type: "job_published",
          title: "Job Published",
          message: `Your job "${jobData.title}" has been automatically published as scheduled.`,
          relatedEntityType: "job",
          relatedEntityId: doc.id,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        errors.push(`Error processing job ${doc.id}: ${err}`);
      }
    }

    if (publishedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      publishedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error publishing scheduled jobs:", error);
    return NextResponse.json(
      { error: "Failed to publish scheduled jobs" },
      { status: 500 }
    );
  }
}
