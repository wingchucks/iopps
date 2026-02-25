import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/expire-jobs
 * Runs daily at 07:00 UTC. Finds active jobs with past closing dates
 * and sets their status to "closed".
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // "2026-02-24"
    let closedCount = 0;

    // Check posts collection for active jobs with past closing dates
    const postsSnap = await db
      .collection("posts")
      .where("status", "==", "active")
      .get();

    const batch1 = db.batch();
    for (const doc of postsSnap.docs) {
      const data = doc.data();
      if (data.closingDate && data.closingDate < todayStr) {
        batch1.update(doc.ref, { status: "closed" });
        closedCount++;
      }
    }
    if (closedCount > 0) await batch1.commit();

    // Check jobs collection too
    let jobsClosed = 0;
    const jobsSnap = await db
      .collection("jobs")
      .where("status", "==", "active")
      .get();

    const batch2 = db.batch();
    for (const doc of jobsSnap.docs) {
      const data = doc.data();
      const closingDate = data.closingDate || data.deadline;
      if (closingDate && closingDate < todayStr) {
        batch2.update(doc.ref, { status: "closed" });
        jobsClosed++;
      }
    }
    if (jobsClosed > 0) await batch2.commit();

    return NextResponse.json({
      ok: true,
      closedPosts: closedCount,
      closedJobs: jobsClosed,
      checkedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[expire-jobs] Error:", err);
    return NextResponse.json(
      { error: "Failed to expire jobs" },
      { status: 500 }
    );
  }
}
