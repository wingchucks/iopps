import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Max age in days for jobs with no closing date before auto-expiry. */
const MAX_AGE_DAYS = 60;

/** Convert a Firestore timestamp, ISO string, or date string to a Date. */
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Check if a date string (YYYY-MM-DD or ISO) is in the past. */
function isDatePast(val: unknown, now: Date): boolean {
  // Handle simple YYYY-MM-DD string comparison first (most common in this codebase)
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val < now.toISOString().split("T")[0];
  }
  const d = toDate(val);
  return d ? d.getTime() < now.getTime() : false;
}

/** Check if a job was created more than maxDays ago. */
function isOlderThan(createdAt: unknown, maxDays: number, now: Date): boolean {
  const d = toDate(createdAt);
  if (!d) return false;
  const ageMs = now.getTime() - d.getTime();
  return ageMs > maxDays * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// GET /api/cron/expire-jobs
//
// Runs daily at 07:00 UTC via Vercel Cron.
//
// Expiry rules:
//   1. Jobs with a closingDate/deadline in the past → closed
//   2. Jobs with no closingDate that are older than MAX_AGE_DAYS → closed
//   3. Jobs with active === false but status still "active" → status closed
//
// Applies to both "posts" and "jobs" collections.
// Protected by CRON_SECRET bearer token.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();

    const results = {
      posts: { closedByDate: 0, closedByAge: 0, closedByInactive: 0 },
      jobs: { closedByDate: 0, closedByAge: 0, closedByInactive: 0 },
      errors: [] as string[],
      checkedAt: now.toISOString(),
    };

    // ------ Process "posts" collection ------
    try {
      const postsSnap = await db
        .collection("posts")
        .where("status", "==", "active")
        .get();

      if (postsSnap.size > 0) {
        // Firestore batch limit is 500
        const BATCH_SIZE = 500;
        const toClose: FirebaseFirestore.DocumentReference[] = [];
        const reasons: string[] = [];

        for (const doc of postsSnap.docs) {
          const data = doc.data();
          const closingDate = data.closingDate || data.deadline;

          // Rule 1: Past closing date
          if (closingDate && isDatePast(closingDate, now)) {
            toClose.push(doc.ref);
            reasons.push("date");
            continue;
          }

          // Rule 2: No closing date + older than MAX_AGE_DAYS
          if (
            !closingDate &&
            data.createdAt &&
            isOlderThan(data.createdAt, MAX_AGE_DAYS, now)
          ) {
            toClose.push(doc.ref);
            reasons.push("age");
            continue;
          }

          // Rule 3: active === false but status still "active"
          if (data.active === false) {
            toClose.push(doc.ref);
            reasons.push("inactive");
            continue;
          }
        }

        // Commit in batches
        for (let i = 0; i < toClose.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const chunk = toClose.slice(i, i + BATCH_SIZE);
          const reasonChunk = reasons.slice(i, i + BATCH_SIZE);

          for (let j = 0; j < chunk.length; j++) {
            batch.update(chunk[j], {
              status: "closed",
              autoExpired: true,
              autoExpiredAt: now.toISOString(),
              autoExpiredReason: reasonChunk[j],
            });
          }
          await batch.commit();
        }

        results.posts.closedByDate = reasons.filter(
          (r) => r === "date"
        ).length;
        results.posts.closedByAge = reasons.filter((r) => r === "age").length;
        results.posts.closedByInactive = reasons.filter(
          (r) => r === "inactive"
        ).length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`posts: ${msg}`);
      console.error("[expire-jobs] Posts error:", err);
    }

    // ------ Process "jobs" collection ------
    try {
      const jobsSnap = await db
        .collection("jobs")
        .where("status", "==", "active")
        .get();

      if (jobsSnap.size > 0) {
        const BATCH_SIZE = 500;
        const toClose: FirebaseFirestore.DocumentReference[] = [];
        const reasons: string[] = [];

        for (const doc of jobsSnap.docs) {
          const data = doc.data();
          const closingDate = data.closingDate || data.deadline;

          // Rule 1: Past closing date
          if (closingDate && isDatePast(closingDate, now)) {
            toClose.push(doc.ref);
            reasons.push("date");
            continue;
          }

          // Rule 2: No closing date + older than MAX_AGE_DAYS
          if (
            !closingDate &&
            data.createdAt &&
            isOlderThan(data.createdAt, MAX_AGE_DAYS, now)
          ) {
            toClose.push(doc.ref);
            reasons.push("age");
            continue;
          }

          // Rule 3: active === false but status still "active"
          if (data.active === false) {
            toClose.push(doc.ref);
            reasons.push("inactive");
            continue;
          }
        }

        // Commit in batches
        for (let i = 0; i < toClose.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const chunk = toClose.slice(i, i + BATCH_SIZE);
          const reasonChunk = reasons.slice(i, i + BATCH_SIZE);

          for (let j = 0; j < chunk.length; j++) {
            batch.update(chunk[j], {
              status: "closed",
              autoExpired: true,
              autoExpiredAt: now.toISOString(),
              autoExpiredReason: reasonChunk[j],
            });
          }
          await batch.commit();
        }

        results.jobs.closedByDate = reasons.filter(
          (r) => r === "date"
        ).length;
        results.jobs.closedByAge = reasons.filter((r) => r === "age").length;
        results.jobs.closedByInactive = reasons.filter(
          (r) => r === "inactive"
        ).length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`jobs: ${msg}`);
      console.error("[expire-jobs] Jobs error:", err);
    }

    const totalClosed =
      results.posts.closedByDate +
      results.posts.closedByAge +
      results.posts.closedByInactive +
      results.jobs.closedByDate +
      results.jobs.closedByAge +
      results.jobs.closedByInactive;

    console.log(
      `[expire-jobs] Closed ${totalClosed} total (posts: ${
        results.posts.closedByDate + results.posts.closedByAge + results.posts.closedByInactive
      }, jobs: ${
        results.jobs.closedByDate + results.jobs.closedByAge + results.jobs.closedByInactive
      })`
    );

    return NextResponse.json({ ok: true, totalClosed, ...results });
  } catch (err) {
    console.error("[expire-jobs] Fatal error:", err);
    return NextResponse.json(
      { error: "Failed to expire jobs" },
      { status: 500 }
    );
  }
}
