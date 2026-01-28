import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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
    console.log("Starting scholarship expiration cron job...");

    const now = new Date();
    let expiredCount = 0;
    let alreadyExpiredCount = 0;

    // Query scholarships where deadline <= current date AND active = true
    // AND not force-published by admin
    console.log("Querying scholarships with expired deadlines...");

    const expiredSnapshot = await db
      .collection("scholarships")
      .where("active", "==", true)
      .where("deadline", "<=", Timestamp.fromDate(now))
      .get();

    if (!expiredSnapshot.empty) {
      console.log(
        `Found ${expiredSnapshot.size} scholarships with expired deadlines`
      );

      for (const scholarshipDoc of expiredSnapshot.docs) {
        const data = scholarshipDoc.data();

        // Skip if admin has force-published this scholarship
        if (data.adminOverride?.forcePublished === true) {
          console.log(`Skipping scholarship ${scholarshipDoc.id} - force published by admin`);
          continue;
        }

        try {
          await db.collection("scholarships").doc(scholarshipDoc.id).update({
            active: false,
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "deadline_passed",
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
          console.log(`Expired scholarship: ${scholarshipDoc.id} - "${data.title}"`);
        } catch (error) {
          console.error(`Error updating scholarship ${scholarshipDoc.id}:`, error);
        }
      }
    } else {
      console.log("No scholarships with expired deadlines found");
    }

    // Also check for scholarships that were already inactive but need expiration metadata
    console.log("Checking inactive scholarships for expiration metadata...");

    const inactiveSnapshot = await db
      .collection("scholarships")
      .where("active", "==", false)
      .where("deadline", "<=", Timestamp.fromDate(now))
      .get();

    for (const scholarshipDoc of inactiveSnapshot.docs) {
      const data = scholarshipDoc.data();

      // Add expiration metadata if missing
      if (!data.expiredAt && !data.expirationReason) {
        try {
          await db.collection("scholarships").doc(scholarshipDoc.id).update({
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "deadline_passed",
          });
          alreadyExpiredCount++;
        } catch (error) {
          console.error(`Error updating scholarship metadata ${scholarshipDoc.id}:`, error);
        }
      }
    }

    console.log(
      `Scholarship expiration cron completed. Newly expired: ${expiredCount}, Metadata updated: ${alreadyExpiredCount}`
    );

    return NextResponse.json({
      success: true,
      scholarshipsExpired: expiredCount,
      metadataUpdated: alreadyExpiredCount,
      timestamp: now.toISOString(),
      message: `Successfully expired ${expiredCount} scholarship(s) and updated metadata for ${alreadyExpiredCount} scholarship(s)`,
    });
  } catch (error) {
    console.error("Scholarship expiration cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to process scholarship expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
