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
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized cron request - invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    console.log("Starting event expiration cron job...");

    const now = new Date();
    let powwowsExpired = 0;
    let conferencesExpired = 0;

    // =========================================================================
    // POW WOW EXPIRATION
    // Deactivate pow wows where endDate has passed
    // =========================================================================
    console.log("Querying pow wows with expired endDate...");
    const expiredPowwowsSnapshot = await db
      .collection("powwows")
      .where("active", "==", true)
      .where("endDate", "<=", now)
      .get();

    if (!expiredPowwowsSnapshot.empty) {
      console.log(
        `Found ${expiredPowwowsSnapshot.size} pow wows with expired endDate`
      );

      for (const powwowDoc of expiredPowwowsSnapshot.docs) {
        try {
          await db.collection("powwows").doc(powwowDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "endDate passed",
          });
          powwowsExpired++;
          console.log(`Expired pow wow: ${powwowDoc.id}`);
        } catch (error) {
          console.error(`Error updating pow wow ${powwowDoc.id}:`, error);
        }
      }
    }

    console.log(
      `Pow wow expiration completed. Total expired: ${powwowsExpired}`
    );

    // =========================================================================
    // CONFERENCE EXPIRATION
    // Deactivate conferences where endDate has passed
    // =========================================================================
    console.log("Querying conferences with expired endDate...");
    const expiredConferencesSnapshot = await db
      .collection("conferences")
      .where("active", "==", true)
      .where("endDate", "<=", now)
      .get();

    if (!expiredConferencesSnapshot.empty) {
      console.log(
        `Found ${expiredConferencesSnapshot.size} conferences with expired endDate`
      );

      for (const conferenceDoc of expiredConferencesSnapshot.docs) {
        try {
          await db.collection("conferences").doc(conferenceDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "endDate passed",
          });
          conferencesExpired++;
          console.log(`Expired conference: ${conferenceDoc.id}`);
        } catch (error) {
          console.error(
            `Error updating conference ${conferenceDoc.id}:`,
            error
          );
        }
      }
    }

    console.log(
      `Conference expiration completed. Total expired: ${conferencesExpired}`
    );

    return NextResponse.json({
      success: true,
      powwowsExpired,
      conferencesExpired,
      timestamp: now.toISOString(),
      message: `Successfully expired ${powwowsExpired} pow wow(s) and ${conferencesExpired} conference(s)`,
    });
  } catch (error) {
    console.error("Event expiration cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to process event expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
