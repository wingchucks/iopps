import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isEventCompleted } from "@/lib/public-events";

export const runtime = "nodejs";

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
 * GET /api/cron/expire-events
 * Runs daily. Marks completed events inactive so expired items stop surfacing
 * on public pages and member profile event lists.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();

    let expiredEvents = 0;
    const eventsSnap = await db.collection("events").get();
    const eventBatch = db.batch();

    for (const eventDoc of eventsSnap.docs) {
      const data = eventDoc.data() as Record<string, unknown>;
      if (!isEventCompleted(data, now)) continue;

      if (data.status === "completed" && data.active === false) continue;

      eventBatch.update(eventDoc.ref, {
        status: "completed",
        active: false,
        updatedAt: now.toISOString(),
      });
      expiredEvents++;
    }

    if (expiredEvents > 0) {
      await eventBatch.commit();
    }

    let expiredPosts = 0;
    const postsSnap = await db.collection("posts").get();
    const postBatch = db.batch();

    for (const postDoc of postsSnap.docs) {
      const data = postDoc.data() as Record<string, unknown>;
      if (!isEventLikePost(data)) continue;
      if (!isEventCompleted(data, now)) continue;

      if (data.status === "completed" && data.active === false) continue;

      postBatch.update(postDoc.ref, {
        status: "completed",
        active: false,
        updatedAt: now.toISOString(),
      });
      expiredPosts++;
    }

    if (expiredPosts > 0) {
      await postBatch.commit();
    }

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
