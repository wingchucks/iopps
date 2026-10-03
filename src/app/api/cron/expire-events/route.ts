import { NextRequest, NextResponse } from "next/server";
import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { hasEventEnded } from "@/lib/public-events";
import { isScheduledJobRequest } from "@/lib/server/scheduled-job-auth";

export const runtime = "nodejs";

// Firestore allows 500 writes per batch; stay well below it.
const BATCH_LIMIT = 400;

function isEventLikePost(data: Record<string, unknown>): boolean {
  const type = typeof data.type === "string" ? data.type.trim().toLowerCase() : "";
  const eventType =
    typeof data.eventType === "string" ? data.eventType.trim().toLowerCase() : "";
  const category =
    typeof data.category === "string" ? data.category.trim().toLowerCase() : "";

  return (
    type === "event" ||
    type === "conference" ||
    type === "powwow" ||
    eventType.length > 0 ||
    category === "conference" ||
    category === "event"
  );
}

/**
 * The same publication gate public listings use: explicitly active or published,
 * or a status-less legacy import that was never deactivated. Drafts, reviews,
 * rejected, hidden and deleted records keep their own state.
 */
function isPublished(data: Record<string, unknown>): boolean {
  if (data.active === false) return false;
  return !data.status || ["active", "published"].includes(String(data.status).toLowerCase());
}

async function completeEndedEvents(db: Firestore, docs: QueryDocumentSnapshot[], now: Date): Promise<number> {
  const ended = docs.filter(doc => {
    const data = doc.data() as Record<string, unknown>;
    return isPublished(data) && hasEventEnded(data, now);
  });
  for (let start = 0; start < ended.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    for (const doc of ended.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc.ref, {
        status: "completed",
        active: false,
        updatedAt: now.toISOString(),
      });
    }
    await batch.commit();
  }
  return ended.length;
}

/**
 * GET /api/cron/expire-events
 * Runs daily. Marks published events whose last day (or end time) has passed
 * in their own time zone as completed, so they stop surfacing on public pages
 * and member profile event lists.
 * Called by Vercel Cron or the scheduled-jobs GitHub workflow.
 */
export async function GET(req: NextRequest) {
  if (!await isScheduledJobRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();

    const eventsSnap = await db.collection("events").get();
    const expiredEvents = await completeEndedEvents(db, eventsSnap.docs, now);

    const postsSnap = await db.collection("posts").get();
    const eventPosts = postsSnap.docs.filter(doc => isEventLikePost(doc.data() as Record<string, unknown>));
    const expiredPosts = await completeEndedEvents(db, eventPosts, now);

    return NextResponse.json({
      ok: true,
      expiredEvents,
      expiredPosts,
      checkedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[expire-events] Error:", err);
    return NextResponse.json(
      { error: "Failed to expire events" },
      { status: 500 }
    );
  }
}
