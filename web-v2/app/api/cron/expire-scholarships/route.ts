import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cron/expire-scholarships
// Runs daily at 2 AM. Expires scholarships past their deadline.
// Respects admin overrides (forcePublished).
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

interface ScholarshipData {
  active: boolean;
  deadline: FirebaseFirestore.Timestamp | Date;
  adminOverride?: {
    forcePublished?: boolean;
  };
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    console.error("[cron/expire-scholarships] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  try {
    console.log("[cron/expire-scholarships] Starting scholarship expiration cron...");
    const now = new Date();

    let expired = 0;
    let skippedOverrides = 0;

    const snap = await adminDb
      .collection("scholarships")
      .where("active", "==", true)
      .where("deadline", "<=", now)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as ScholarshipData;

      // Respect admin override -- do not expire force-published scholarships
      if (data.adminOverride?.forcePublished === true) {
        skippedOverrides++;
        continue;
      }

      try {
        await doc.ref.update({
          active: false,
          expiredAt: FieldValue.serverTimestamp(),
          expirationReason: "Deadline passed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        expired++;
      } catch (err) {
        console.error(
          `[cron/expire-scholarships] Error expiring scholarship ${doc.id}:`,
          err,
        );
      }
    }

    console.log(
      `[cron/expire-scholarships] Complete. Expired: ${expired}, Skipped overrides: ${skippedOverrides}`,
    );

    return NextResponse.json({
      expired,
      skippedOverrides,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/expire-scholarships] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process scholarship expiration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
