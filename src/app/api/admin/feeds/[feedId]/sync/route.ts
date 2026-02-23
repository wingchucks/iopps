import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const FEED_FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// POST /api/admin/feeds/[feedId]/sync — Trigger manual sync for a feed
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { feedId } = await params;
  const startTime = Date.now();

  try {
    const feedDoc = await adminDb.collection("rssFeeds").doc(feedId).get();
    if (!feedDoc.exists) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const feed = { id: feedDoc.id, ...feedDoc.data() } as {
      id: string;
      feedUrl: string;
      feedName: string;
      employerId: string;
      employerName?: string;
      updateExistingJobs?: boolean;
      totalJobsImported?: number;
    };

    // Fetch the RSS feed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(feed.feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent": "IOPPS-FeedSync/1.0",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      await adminDb.collection("rssFeeds").doc(feedId).update({
        lastSyncError: errorMsg,
        lastSyncedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const xml = await response.text();
    const items = parseSimpleXml(xml);

    let jobsImported = 0;

    for (const item of items) {
      try {
        const externalId = item.guid || item.id || item.link || "";
        const externalUrl = item.link || item.url || "";
        const title = item.title || "Untitled Position";
        const description = item.description || item.summary || item.content || "";

        if (!externalId && !externalUrl) continue;

        // Check for duplicates
        const duplicateQuery = externalId
          ? adminDb.collection("jobs").where("externalId", "==", externalId).limit(1)
          : adminDb.collection("jobs").where("externalUrl", "==", externalUrl).limit(1);

        const existingSnap = await duplicateQuery.get();

        if (!existingSnap.empty) {
          if (feed.updateExistingJobs) {
            const existingDoc = existingSnap.docs[0];
            await existingDoc.ref.update({
              title,
              description: stripCdata(description),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          continue;
        }

        const jobData: Record<string, unknown> = {
          title,
          description: stripCdata(description),
          active: true,
          source: "feed",
          feedId: feed.id,
          externalId: externalId || null,
          externalUrl: externalUrl || null,
          employerId: feed.employerId,
          employerName: feed.employerName || null,
          location: item.location || "Canada",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (item.pubDate) {
          try {
            jobData.publishedAt = new Date(item.pubDate);
          } catch {
            // ignore invalid date
          }
        }

        await adminDb.collection("jobs").add(jobData);
        jobsImported++;
      } catch (itemErr) {
        console.error(`[admin/feeds/sync] Error processing item:`, itemErr);
      }
    }

    // Update feed metadata
    await adminDb.collection("rssFeeds").doc(feedId).update({
      lastSyncedAt: FieldValue.serverTimestamp(),
      lastSyncError: null,
      totalJobsImported: (feed.totalJobsImported || 0) + jobsImported,
    });

    // Log the sync
    await adminDb.collection("cronLogs").add({
      type: "feed_sync",
      feedId: feed.id,
      frequency: "manual",
      jobsImported,
      durationMs: Date.now() - startTime,
      triggeredBy: auth.decodedToken?.uid || "admin",
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      jobsImported,
      totalItems: items.length,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[admin/feeds/sync] Error:", err);

    // Log the failed sync
    try {
      await adminDb.collection("cronLogs").add({
        type: "feed_sync",
        feedId,
        frequency: "manual",
        jobsImported: 0,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        triggeredBy: auth.decodedToken?.uid || "admin",
        timestamp: FieldValue.serverTimestamp(),
      });
      await adminDb.collection("rssFeeds").doc(feedId).update({
        lastSyncError: err instanceof Error ? err.message : String(err),
        lastSyncedAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// XML parser (same as cron/sync-feeds)
// ---------------------------------------------------------------------------

function parseSimpleXml(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  // Support both <item> (standard RSS) and <job> (SmartJobBoard) tags
  const itemRegex = /<(?:item|job)>([\s\S]*?)<\/(?:item|job)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item: Record<string, string> = {};
    const content = match[1];
    const fieldRegex = /<(\w+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(content)) !== null) {
      item[fieldMatch[1].toLowerCase()] = fieldMatch[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    }

    // Normalize SmartJobBoard field names to RSS standard
    if (!item.link && item.url) item.link = item.url;
    if (!item.guid && item.referencenumber) item.guid = item.referencenumber;
    if (!item.pubDate && item.date) item.pubDate = item.date;
    if (!item.location && (item.city || item.state)) {
      item.location = [item.city, item.state, item.country]
        .filter(Boolean)
        .join(", ");
    }

    items.push(item);
  }

  return items;
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}
