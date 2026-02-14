import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cron/expire-events
// Runs daily at 1 AM. Expires pow wows and conferences whose endDate has passed.
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
    console.error("[cron/expire-events] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  try {
    console.log("[cron/expire-events] Starting event expiration cron...");
    const now = new Date();

    // Expire pow wows and conferences in parallel
    const [powwowsExpired, conferencesExpired] = await Promise.all([
      expireCollection("powwows", now),
      expireCollection("conferences", now),
    ]);

    console.log(
      `[cron/expire-events] Complete. Pow wows: ${powwowsExpired}, Conferences: ${conferencesExpired}`,
    );

    return NextResponse.json({
      expired: {
        powwows: powwowsExpired,
        conferences: conferencesExpired,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/expire-events] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process event expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared helper: expire active documents past their endDate in a collection
// ---------------------------------------------------------------------------
async function expireCollection(
  collectionName: string,
  now: Date,
): Promise<number> {
  let count = 0;

  const snap = await adminDb!
    .collection(collectionName)
    .where("active", "==", true)
    .where("endDate", "<=", now)
    .get();

  for (const doc of snap.docs) {
    try {
      await doc.ref.update({
        active: false,
        expiredAt: FieldValue.serverTimestamp(),
        expirationReason: "End date passed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    } catch (err) {
      console.error(
        `[cron/expire-events] Error expiring ${collectionName} ${doc.id}:`,
        err,
      );
    }
  }

  return count;
}
