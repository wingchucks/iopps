import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cron/publish-scheduled-jobs
// Runs every 15 minutes. Publishes jobs that have a scheduledPublishAt in the past,
// creates a notification for the employer.
// ---------------------------------------------------------------------------

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ") || !process.env.CRON_SECRET) return false;
  const token = authHeader.substring(7);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(process.env.CRON_SECRET),
    );
  } catch {
    return false;
  }
}

interface ScheduledJobData {
  employerId: string;
  title: string;
  scheduledPublishAt: FirebaseFirestore.Timestamp | Date;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    console.error("[cron/publish-scheduled-jobs] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  try {
    console.log("[cron/publish-scheduled-jobs] Starting scheduled job publishing...");
    const now = new Date();
    let published = 0;
    const errors: string[] = [];

    const snap = await adminDb
      .collection("jobs")
      .where("active", "==", false)
      .where("scheduledPublishAt", "<=", now)
      .get();

    if (snap.empty) {
      return NextResponse.json({
        published: 0,
        timestamp: now.toISOString(),
      });
    }

    const batch = adminDb.batch();

    for (const doc of snap.docs) {
      try {
        const data = doc.data() as ScheduledJobData;

        // Publish the job and clear the scheduled date
        batch.update(doc.ref, {
          active: true,
          publishedAt: FieldValue.serverTimestamp(),
          scheduledPublishAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Create notification for the employer
        const notificationRef = adminDb.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: data.employerId,
          type: "job_published",
          title: "Your job is now live",
          message: `${data.title} has been published`,
          jobId: doc.id,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        published++;
      } catch (err) {
        const msg = `Error processing job ${doc.id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[cron/publish-scheduled-jobs] ${msg}`);
        errors.push(msg);
      }
    }

    if (published > 0) {
      await batch.commit();
    }

    console.log(`[cron/publish-scheduled-jobs] Complete. Published: ${published}`);

    return NextResponse.json({
      published,
      ...(errors.length > 0 && { errors }),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/publish-scheduled-jobs] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to publish scheduled jobs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
