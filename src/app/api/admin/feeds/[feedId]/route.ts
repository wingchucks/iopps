import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/feeds/[feedId] — Single feed detail + recent sync logs
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { feedId } = await params;

  try {
    const feedDoc = await adminDb.collection("rssFeeds").doc(feedId).get();
    if (!feedDoc.exists) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const feed = { id: feedDoc.id, ...feedDoc.data() };

    // Fetch recent sync logs for this feed
    const logsSnap = await adminDb
      .collection("cronLogs")
      .where("feedId", "==", feedId)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    const syncLogs = logsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ feed, syncLogs });
  } catch (err) {
    console.error("[admin/feeds/[feedId]] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/feeds/[feedId] — Update feed settings
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { feedId } = await params;

  try {
    const body = await request.json();
    const allowedFields = ["feedName", "feedUrl", "syncFrequency", "active", "mapping", "updateExistingJobs"];
    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate URL if provided
    if (updates.feedUrl) {
      try {
        new URL(updates.feedUrl as string);
      } catch {
        return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
      }
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    const feedRef = adminDb.collection("rssFeeds").doc(feedId);
    const feedDoc = await feedRef.get();
    if (!feedDoc.exists) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    await feedRef.update(updates);

    return NextResponse.json({ success: true, updated: updates });
  } catch (err) {
    console.error("[admin/feeds/[feedId]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update feed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/feeds/[feedId] — Remove a feed
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { feedId } = await params;

  try {
    const feedRef = adminDb.collection("rssFeeds").doc(feedId);
    const feedDoc = await feedRef.get();
    if (!feedDoc.exists) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    await feedRef.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/feeds/[feedId]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete feed" }, { status: 500 });
  }
}
