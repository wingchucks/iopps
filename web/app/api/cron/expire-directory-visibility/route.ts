import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { expireStaleVisibility, recomputeOrganizationVisibility } from "@/lib/firestore/visibility";
import { FieldValue } from "firebase-admin/firestore";
import { verifyCronSecret } from "@/lib/cron-auth";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for processing many orgs

/**
 * GET /api/cron/expire-directory-visibility
 *
 * Scheduled job that runs daily (or hourly) to:
 * 1. Find organizations where visibility should have expired
 * 2. Recompute their visibility to update isDirectoryVisible
 *
 * This ensures listings expire even if no triggers run (e.g., webhook failures).
 *
 * Schedule: Daily at midnight (0 0 * * *)
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security - REQUIRED in all environments
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // Check if Firebase Admin is initialized
  if (!db) {
    console.error("[expire-directory-visibility] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const startTime = Date.now();
  console.log("[expire-directory-visibility] Starting scheduled visibility check...");

  try {
    // Use the expireStaleVisibility function from visibility module
    const result = await expireStaleVisibility();

    const duration = Date.now() - startTime;
    console.log(
      `[expire-directory-visibility] Completed in ${duration}ms: ` +
        `${result.checked} checked, ${result.expired} expired, ${result.errors.length} errors`
    );

    // Also check for grandfathered orgs that are now unapproved
    let unapprovedGrandfathered = 0;
    try {
      const grandfatheredSnapshot = await db
        .collection("employers")
        .where("isGrandfathered", "==", true)
        .where("isDirectoryVisible", "==", true)
        .get();

      for (const orgDoc of grandfatheredSnapshot.docs) {
        const data = orgDoc.data();
        // If grandfathered but no longer approved, recompute
        if (data.status !== "approved") {
          const recomputeResult = await recomputeOrganizationVisibility(orgDoc.id);
          if (recomputeResult.success && !recomputeResult.isDirectoryVisible) {
            unapprovedGrandfathered++;
          }
        }
      }
    } catch (error) {
      console.warn("[expire-directory-visibility] Error checking grandfathered orgs:", error);
    }

    // Log summary to Firestore for monitoring
    try {
      await db.collection("system_logs").add({
        event: "expire_directory_visibility_cron",
        checked: result.checked,
        expired: result.expired,
        unapprovedGrandfathered,
        errors: result.errors.slice(0, 10), // Keep first 10 errors
        duration,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.warn("[expire-directory-visibility] Failed to log to Firestore:", logError);
    }

    return NextResponse.json({
      success: true,
      checked: result.checked,
      expired: result.expired,
      unapprovedGrandfathered,
      errors: result.errors.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      message: `Visibility check complete. ${result.expired} org(s) expired, ${unapprovedGrandfathered} unapproved grandfathered org(s) hidden.`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[expire-directory-visibility] Cron error:", error);

    // Log error to Firestore
    try {
      await db.collection("system_logs").add({
        event: "expire_directory_visibility_cron_error",
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error("[expire-directory-visibility] Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        error: "Failed to process visibility expiration",
        details: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
