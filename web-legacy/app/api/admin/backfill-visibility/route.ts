import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import {
  recomputeOrganizationVisibility,
  recomputeOrganizationVisibilityForAllApprovedOrgs,
} from "@/lib/firestore/visibility";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large backfills

/**
 * POST /api/admin/backfill-visibility
 *
 * Admin-only endpoint to backfill/migrate organization visibility.
 *
 * Operations:
 * 1. "grandfather" - Mark existing approved orgs as grandfathered (permanent visibility)
 * 2. "recompute_all" - Recompute visibility for all approved orgs
 * 3. "recompute_one" - Recompute visibility for a single org
 *
 * Request body:
 * - operation: "grandfather" | "recompute_all" | "recompute_one"
 * - orgId?: string (required for "recompute_one")
 * - dryRun?: boolean (preview without writing)
 * - cutoffDate?: string (ISO date for grandfather cutoff)
 */
export async function POST(request: NextRequest) {
  // Check Firebase Admin initialization
  if (!db || !auth) {
    console.error("[backfill-visibility] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  // Verify authentication - admin only
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(token);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 }
    );
  }

  const isAdmin = decodedToken.admin === true;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { operation, orgId, dryRun, cutoffDate } = body;

  if (!operation) {
    return NextResponse.json(
      { error: "operation is required: grandfather | recompute_all | recompute_one" },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    switch (operation) {
      // ============================================
      // GRANDFATHER MIGRATION
      // Mark existing approved orgs as grandfathered
      // ============================================
      case "grandfather": {
        // Default cutoff: now (all currently approved orgs are grandfathered)
        const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();

        // Query all approved organizations
        const snapshot = await db
          .collection("employers")
          .where("status", "==", "approved")
          .get();

        let processed = 0;
        let grandfathered = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const doc of snapshot.docs) {
          processed++;
          const data = doc.data();

          // Skip if already grandfathered
          if (data.isGrandfathered === true) {
            skipped++;
            continue;
          }

          // Check if org was created/approved before cutoff
          const createdAt = data.createdAt?.toDate?.() || data.approvedAt?.toDate?.();
          if (createdAt && createdAt > cutoff) {
            // Org created after cutoff - not grandfathered
            skipped++;
            continue;
          }

          if (!dryRun) {
            try {
              await doc.ref.update({
                isGrandfathered: true,
                isDirectoryVisible: true,
                directoryVisibleUntil: null, // null = permanent
                visibilityReason: "grandfathered",
                visibilityComputedAt: FieldValue.serverTimestamp(),
                visibilitySourceDetails: {
                  maxSource: "none",
                  eligibleJobsCount: 0,
                },
                updatedAt: FieldValue.serverTimestamp(),
              });
              grandfathered++;
            } catch (error) {
              errors.push(`${doc.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          } else {
            grandfathered++;
          }
        }

        const duration = Date.now() - startTime;

        // Log to Firestore
        if (!dryRun) {
          await db.collection("system_logs").add({
            event: "visibility_grandfather_migration",
            processed,
            grandfathered,
            skipped,
            errors: errors.slice(0, 10),
            duration,
            cutoffDate: cutoff.toISOString(),
            adminId: decodedToken.uid,
            timestamp: FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          operation: "grandfather",
          dryRun: !!dryRun,
          processed,
          grandfathered,
          skipped,
          errors: errors.length,
          errorDetails: errors.slice(0, 10),
          cutoffDate: cutoff.toISOString(),
          duration: `${duration}ms`,
        });
      }

      // ============================================
      // RECOMPUTE ALL
      // Recompute visibility for all approved orgs
      // ============================================
      case "recompute_all": {
        const result = await recomputeOrganizationVisibilityForAllApprovedOrgs({
          dryRun: !!dryRun,
        });

        const duration = Date.now() - startTime;

        // Log to Firestore
        if (!dryRun) {
          await db.collection("system_logs").add({
            event: "visibility_bulk_recompute",
            ...result,
            errors: result.errors.slice(0, 10),
            duration,
            adminId: decodedToken.uid,
            timestamp: FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          operation: "recompute_all",
          dryRun: !!dryRun,
          ...result,
          errorDetails: result.errors.slice(0, 10),
          duration: `${duration}ms`,
        });
      }

      // ============================================
      // RECOMPUTE ONE
      // Recompute visibility for a single org
      // ============================================
      case "recompute_one": {
        if (!orgId || typeof orgId !== "string") {
          return NextResponse.json(
            { error: "orgId is required for recompute_one operation" },
            { status: 400 }
          );
        }

        const result = await recomputeOrganizationVisibility(orgId, {
          dryRun: !!dryRun,
        });

        const duration = Date.now() - startTime;

        return NextResponse.json({
          success: result.success,
          operation: "recompute_one",
          dryRun: !!dryRun,
          orgId,
          isDirectoryVisible: result.isDirectoryVisible,
          visibilityReason: result.visibilityReason,
          directoryVisibleUntil: result.directoryVisibleUntil?.toISOString() || null,
          sourceDetails: result.sourceDetails,
          error: result.error,
          duration: `${duration}ms`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[backfill-visibility] Error:", error);
    return NextResponse.json(
      {
        error: "Operation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/backfill-visibility
 *
 * Get visibility statistics and migration status
 */
export async function GET(request: NextRequest) {
  // Check Firebase Admin initialization
  if (!db || !auth) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  // Verify authentication - admin only
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    if (decodedToken.admin !== true) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 }
    );
  }

  try {
    // Get visibility statistics
    const [
      totalApproved,
      grandfathered,
      visibleSnapshot,
      hiddenSnapshot,
      withVisibilityField,
    ] = await Promise.all([
      db.collection("employers").where("status", "==", "approved").count().get(),
      db.collection("employers").where("isGrandfathered", "==", true).count().get(),
      db.collection("employers")
        .where("status", "==", "approved")
        .where("isDirectoryVisible", "==", true)
        .count().get(),
      db.collection("employers")
        .where("status", "==", "approved")
        .where("isDirectoryVisible", "==", false)
        .count().get(),
      db.collection("employers")
        .where("status", "==", "approved")
        .orderBy("isDirectoryVisible")
        .count().get(),
    ]);

    const stats = {
      totalApproved: totalApproved.data().count,
      grandfathered: grandfathered.data().count,
      visible: visibleSnapshot.data().count,
      hidden: hiddenSnapshot.data().count,
      withVisibilityField: withVisibilityField.data().count,
      needsMigration: totalApproved.data().count - withVisibilityField.data().count,
    };

    // Get recent logs
    const logsSnapshot = await db
      .collection("system_logs")
      .where("event", "in", [
        "visibility_grandfather_migration",
        "visibility_bulk_recompute",
        "expire_directory_visibility_cron",
      ])
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();

    const recentLogs = logsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      stats,
      recentLogs,
    });
  } catch (error) {
    console.error("[backfill-visibility] Stats error:", error);
    return NextResponse.json(
      {
        error: "Failed to get statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
