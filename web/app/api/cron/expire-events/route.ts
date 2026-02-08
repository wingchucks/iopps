import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyCronSecret } from "@/lib/cron-auth";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security - REQUIRED in all environments
  const authError = verifyCronSecret(request);
  if (authError) return authError;

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
    const expiredPowwowsSnapshot = await db
      .collection("powwows")
      .where("active", "==", true)
      .where("endDate", "<=", now)
      .get();

    if (!expiredPowwowsSnapshot.empty) {
      for (const powwowDoc of expiredPowwowsSnapshot.docs) {
        try {
          await db.collection("powwows").doc(powwowDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "endDate passed",
          });
          powwowsExpired++;
        } catch (error) {
          console.error(`Error updating pow wow ${powwowDoc.id}:`, error);
        }
      }
    }

    // =========================================================================
    // CONFERENCE EXPIRATION
    // Deactivate conferences where endDate has passed
    // =========================================================================
    const expiredConferencesSnapshot = await db
      .collection("conferences")
      .where("active", "==", true)
      .where("endDate", "<=", now)
      .get();

    if (!expiredConferencesSnapshot.empty) {
      for (const conferenceDoc of expiredConferencesSnapshot.docs) {
        try {
          await db.collection("conferences").doc(conferenceDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
            expiredAt: FieldValue.serverTimestamp(),
            expirationReason: "endDate passed",
          });
          conferencesExpired++;
        } catch (error) {
          console.error(
            `Error updating conference ${conferenceDoc.id}:`,
            error
          );
        }
      }
    }

    console.log(
      `Event expiration cron completed. Pow wows expired: ${powwowsExpired}, Conferences expired: ${conferencesExpired}`
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
