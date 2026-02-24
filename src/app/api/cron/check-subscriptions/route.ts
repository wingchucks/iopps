import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/check-subscriptions
 * Runs daily. Finds expired subscriptions and downgrades employer plans.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    let expired = 0;
    let checked = 0;

    // Find active subscriptions that have expired
    const subsSnap = await db
      .collection("subscriptions")
      .where("status", "==", "active")
      .get();

    for (const doc of subsSnap.docs) {
      checked++;
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.() || data.expiresAt;

      if (!expiresAt) continue;

      const expiryDate = new Date(expiresAt);
      if (expiryDate > now) continue;

      // This subscription has expired
      const orgId = data.orgId;
      const planId = data.plan;

      // Mark subscription as expired
      await doc.ref.update({ status: "expired", expiredAt: now });

      // Check if org has any other active subscription
      const otherActive = await db
        .collection("subscriptions")
        .where("orgId", "==", orgId)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (otherActive.empty) {
        // No other active subs — downgrade to free
        const batch = db.batch();

        const empRef = db.collection("employers").doc(orgId);
        batch.set(empRef, {
          plan: "free",
          subscriptionTier: "free",
          subscriptionStatus: "expired",
          updatedAt: now,
        }, { merge: true });

        // Also update organizations doc
        const orgRef = db.collection("organizations").doc(orgId);
        const orgSnap = await orgRef.get();
        if (orgSnap.exists) {
          batch.set(orgRef, { plan: null, subscriptionTier: "free", updatedAt: now }, { merge: true });
        }

        await batch.commit();
        console.log(`[cron/subs] Expired ${planId} for org ${orgId}`);
      }

      expired++;
    }

    return NextResponse.json({
      checked,
      expired,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[cron/check-subscriptions] Error:", err);
    return NextResponse.json({ error: "Failed to check subscriptions" }, { status: 500 });
  }
}
