import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/feeds — List all RSS feeds with employer names
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const feedsSnap = await adminDb.collection("rssFeeds").orderBy("feedName").get();

    // Collect unique employer IDs for batch lookup
    const employerIds = new Set<string>();
    const feedDocs = feedsSnap.docs.map((doc) => {
      const data = doc.data();
      if (data.employerId) employerIds.add(data.employerId);
      return { id: doc.id, ...data };
    });

    // Fetch employer names
    const employerNames: Record<string, string> = {};
    const employerIdArr = Array.from(employerIds);
    // Firestore `in` queries support max 30 at a time
    for (let i = 0; i < employerIdArr.length; i += 30) {
      const batch = employerIdArr.slice(i, i + 30);
      const empSnap = await adminDb
        .collection("employers")
        .where("__name__", "in", batch)
        .get();
      empSnap.docs.forEach((d) => {
        employerNames[d.id] = d.data().organizationName || d.id;
      });
    }

    const feeds = feedDocs.map((f: Record<string, unknown>) => ({
      id: f.id,
      feedName: f.feedName || "",
      feedUrl: f.feedUrl || "",
      active: f.active ?? true,
      syncFrequency: f.syncFrequency || "daily",
      employerId: f.employerId || "",
      employerName: employerNames[f.employerId as string] || f.employerName || "",
      lastSyncedAt: f.lastSyncedAt || null,
      totalJobsImported: f.totalJobsImported || 0,
      status: f.lastSyncError ? "error" : f.active ? "active" : "paused",
      lastSyncError: f.lastSyncError || null,
    }));

    return NextResponse.json({ feeds });
  } catch (err) {
    console.error("[admin/feeds] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/feeds — Create a new RSS feed
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { feedName, feedUrl, employerId, syncFrequency, mapping } = body;

    if (!feedName || !feedUrl || !employerId) {
      return NextResponse.json(
        { error: "feedName, feedUrl, and employerId are required" },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
    }

    // Look up employer name
    const empDoc = await adminDb.collection("employers").doc(employerId).get();
    const employerName = empDoc.exists
      ? empDoc.data()?.organizationName || employerId
      : employerId;

    const feedData = {
      feedName,
      feedUrl,
      employerId,
      employerName,
      active: true,
      syncFrequency: syncFrequency || "daily",
      mapping: mapping || null,
      totalJobsImported: 0,
      updateExistingJobs: false,
      createdAt: FieldValue.serverTimestamp(),
      lastSyncedAt: null,
      lastSyncError: null,
    };

    const docRef = await adminDb.collection("rssFeeds").add(feedData);

    return NextResponse.json({ id: docRef.id, ...feedData }, { status: 201 });
  } catch (err) {
    console.error("[admin/feeds] POST error:", err);
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }
}
