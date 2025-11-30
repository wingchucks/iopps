import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase-admin/firestore";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no CRON_SECRET configured (development) or if it matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    const expiresAtQuery = query(
      collection(db, "jobs"),
      where("active", "==", true),
      where("expiresAt", "<=", now)
    );

    const expiresAtSnapshot = await getDocs(expiresAtQuery);

    if (!expiresAtSnapshot.empty) {
      console.log(
        `Found ${expiresAtSnapshot.size} jobs with expired expiresAt`
      );

      for (const jobDoc of expiresAtSnapshot.docs) {
        try {
          const jobRef = doc(db, "jobs", jobDoc.id);
          await updateDoc(jobRef, {
            active: false,
            updatedAt: serverTimestamp(),
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
    const closingDateQuery = query(
      collection(db, "jobs"),
      where("active", "==", true),
      where("closingDate", "<=", now)
    );

    const closingDateSnapshot = await getDocs(closingDateQuery);

    if (!closingDateSnapshot.empty) {
      console.log(
        `Found ${closingDateSnapshot.size} jobs with expired closingDate`
      );

      for (const jobDoc of closingDateSnapshot.docs) {
        // Skip if already processed in expiresAt query
        if (expiresAtSnapshot.docs.some((doc) => doc.id === jobDoc.id)) {
          console.log(`Skipping job ${jobDoc.id} - already processed`);
          continue;
        }

        try {
          const jobRef = doc(db, "jobs", jobDoc.id);
          await updateDoc(jobRef, {
            active: false,
            updatedAt: serverTimestamp(),
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
