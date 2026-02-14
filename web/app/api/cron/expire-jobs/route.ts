import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cron/expire-jobs
// Runs daily at midnight. Expires jobs, vendor features, and talent pool access.
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

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    console.error("[cron/expire-jobs] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  try {
    console.log("[cron/expire-jobs] Starting job expiration cron...");
    const now = new Date();

    // Run all three expiration tasks in parallel
    const [jobsExpired, vendorsExpired, talentPoolExpired] = await Promise.all([
      expireJobs(now),
      expireVendorFeatures(now),
      expireTalentPoolAccess(now),
    ]);

    console.log(
      `[cron/expire-jobs] Complete. Jobs: ${jobsExpired}, Vendors: ${vendorsExpired}, TalentPool: ${talentPoolExpired}`,
    );

    return NextResponse.json({
      expired: {
        jobs: jobsExpired,
        vendors: vendorsExpired,
        talentPool: talentPoolExpired,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/expire-jobs] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process job expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Task a) Expire active jobs past their expiresAt or closingDate
// ---------------------------------------------------------------------------
async function expireJobs(now: Date): Promise<number> {
  let count = 0;

  // Query jobs where expiresAt has passed
  const expiresAtSnap = await adminDb!
    .collection("jobs")
    .where("active", "==", true)
    .where("expiresAt", "<=", now)
    .get();

  const processedIds = new Set<string>();

  for (const doc of expiresAtSnap.docs) {
    try {
      await doc.ref.update({
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      processedIds.add(doc.id);
      count++;
    } catch (err) {
      console.error(`[cron/expire-jobs] Error expiring job ${doc.id}:`, err);
    }
  }

  // Query jobs where closingDate has passed
  const closingDateSnap = await adminDb!
    .collection("jobs")
    .where("active", "==", true)
    .where("closingDate", "<=", now)
    .get();

  for (const doc of closingDateSnap.docs) {
    // Skip already-processed docs from the expiresAt query
    if (processedIds.has(doc.id)) continue;

    try {
      await doc.ref.update({
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    } catch (err) {
      console.error(`[cron/expire-jobs] Error expiring job ${doc.id}:`, err);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Task b) Remove featured status from vendors with expired subscriptions
// ---------------------------------------------------------------------------
async function expireVendorFeatures(now: Date): Promise<number> {
  let count = 0;

  const snap = await adminDb!
    .collection("vendors")
    .where("featured", "==", true)
    .where("subscriptionEndsAt", "<=", now)
    .get();

  for (const doc of snap.docs) {
    try {
      await doc.ref.update({
        featured: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    } catch (err) {
      console.error(`[cron/expire-jobs] Error un-featuring vendor ${doc.id}:`, err);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Task c) Deactivate talent pool access for employers past expiry
// ---------------------------------------------------------------------------
async function expireTalentPoolAccess(now: Date): Promise<number> {
  let count = 0;

  const snap = await adminDb!
    .collection("employers")
    .where("talentPoolAccess.active", "==", true)
    .where("talentPoolAccess.expiresAt", "<=", now)
    .get();

  for (const doc of snap.docs) {
    try {
      await doc.ref.update({
        "talentPoolAccess.active": false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    } catch (err) {
      console.error(`[cron/expire-jobs] Error expiring talent pool for employer ${doc.id}:`, err);
    }
  }

  return count;
}
