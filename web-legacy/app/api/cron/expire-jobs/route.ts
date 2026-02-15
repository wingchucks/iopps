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
    const expiresAtSnapshot = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("expiresAt", "<=", now)
      .get();

    if (!expiresAtSnapshot.empty) {
      for (const jobDoc of expiresAtSnapshot.docs) {
        try {
          await db.collection("jobs").doc(jobDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
        } catch (error) {
          console.error(`Error updating job ${jobDoc.id}:`, error);
        }
      }
    }

    // Query 2: Jobs where closingDate <= current date AND active = true
    const closingDateSnapshot = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("closingDate", "<=", now)
      .get();

    if (!closingDateSnapshot.empty) {
      for (const jobDoc of closingDateSnapshot.docs) {
        // Skip if already processed in expiresAt query
        if (expiresAtSnapshot.docs.some((d: { id: string }) => d.id === jobDoc.id)) {
          continue;
        }

        try {
          await db.collection("jobs").doc(jobDoc.id).update({
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          expiredCount++;
        } catch (error) {
          console.error(`Error updating job ${jobDoc.id}:`, error);
        }
      }
    }

    console.log(
      `Job expiration cron completed. Total jobs expired: ${expiredCount}`
    );

    // =========================================================================
    // VENDOR FEATURED EXPIRATION
    // Remove featured status from vendors whose subscription has expired
    // =========================================================================
    let vendorFeaturedRemoved = 0;

    const expiredVendorsSnapshot = await db
      .collection("vendors")
      .where("featured", "==", true)
      .where("subscriptionEndsAt", "<=", now)
      .get();

    if (!expiredVendorsSnapshot.empty) {
      for (const vendorDoc of expiredVendorsSnapshot.docs) {
        try {
          await db.collection("vendors").doc(vendorDoc.id).update({
            featured: false,
            subscriptionStatus: "expired",
            updatedAt: FieldValue.serverTimestamp(),
          });
          vendorFeaturedRemoved++;
        } catch (error) {
          console.error(`Error updating vendor ${vendorDoc.id}:`, error);
        }
      }
    }


    // =========================================================================
    // TALENT POOL ACCESS EXPIRATION
    // Deactivate talent pool access for employers whose subscription has expired
    // =========================================================================
    let talentPoolAccessExpired = 0;

    const expiredTalentPoolSnapshot = await db
      .collection("employers")
      .where("talentPoolAccess.active", "==", true)
      .where("talentPoolAccess.expiresAt", "<=", now)
      .get();

    if (!expiredTalentPoolSnapshot.empty) {
      for (const employerDoc of expiredTalentPoolSnapshot.docs) {
        try {
          await db.collection("employers").doc(employerDoc.id).update({
            "talentPoolAccess.active": false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          talentPoolAccessExpired++;
        } catch (error) {
          console.error(`Error updating employer ${employerDoc.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobsExpired: expiredCount,
      vendorFeaturedRemoved,
      talentPoolAccessExpired,
      timestamp: now.toISOString(),
      message: `Successfully expired ${expiredCount} job(s), removed featured from ${vendorFeaturedRemoved} vendor(s), and expired ${talentPoolAccessExpired} talent pool access(es)`,
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
