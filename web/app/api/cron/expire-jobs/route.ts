import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security - REQUIRED in all environments
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized cron request - invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Firebase Admin is initialized
  if (!db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    console.log("Starting job expiration cron job...");

    const now = new Date();
    let expiredCount = 0;

    // Query 1: Jobs where expiresAt <= current date AND active = true
    console.log("Querying jobs with expired expiresAt...");
    const expiresAtSnapshot = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("expiresAt", "<=", now)
      .get();

    if (!expiresAtSnapshot.empty) {
      console.log(
        `Found ${expiresAtSnapshot.size} jobs with expired expiresAt`
      );

      for (const jobDoc of expiresAtSnapshot.docs) {
        try {
          await db.collection("jobs").doc(jobDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
          console.log(`Expired job: ${jobDoc.id} (expiresAt)`);
        } catch (error) {
          console.error(`Error updating job ${jobDoc.id}:`, error);
        }
      }
    }

    // Query 2: Jobs where closingDate <= current date AND active = true
    console.log("Querying jobs with expired closingDate...");
    const closingDateSnapshot = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("closingDate", "<=", now)
      .get();

    if (!closingDateSnapshot.empty) {
      console.log(
        `Found ${closingDateSnapshot.size} jobs with expired closingDate`
      );

      for (const jobDoc of closingDateSnapshot.docs) {
        // Skip if already processed in expiresAt query
        if (expiresAtSnapshot.docs.some((d: { id: string }) => d.id === jobDoc.id)) {
          console.log(`Skipping job ${jobDoc.id} - already processed`);
          continue;
        }

        try {
          await db.collection("jobs").doc(jobDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
          console.log(`Expired job: ${jobDoc.id} (closingDate)`);
        } catch (error) {
          console.error(`Error updating job ${jobDoc.id}:`, error);
        }
      }
    }

    console.log(
      `Job expiration cron completed. Total jobs expired: ${expiredCount}`
    );

    return NextResponse.json({
      success: true,
      jobsExpired: expiredCount,
      timestamp: now.toISOString(),
      message: `Successfully expired ${expiredCount} job(s)`,
    });
  } catch (error) {
    console.error("Job expiration cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to process job expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
