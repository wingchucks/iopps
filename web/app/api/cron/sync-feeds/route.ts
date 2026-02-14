import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cron/sync-feeds?frequency=hourly|daily|weekly
// Syncs RSS feeds to import external jobs. Frequency defaults to "hourly".
// ---------------------------------------------------------------------------

const FEED_FETCH_TIMEOUT_MS = 10_000;

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

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface RSSFeedDoc {
  id: string;
  feedUrl: string;
  feedName: string;
  active: boolean;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
  employerId: string;
  employerName?: string;
  updateExistingJobs?: boolean;
  totalJobsImported?: number;
  lastSyncedAt?: FirebaseFirestore.Timestamp | Date;
}

interface SyncResult {
  feedId: string;
  feedName: string;
  jobsImported: number;
  error?: string;
}

type ValidFrequency = "hourly" | "daily" | "weekly";

const VALID_FREQUENCIES: ReadonlySet<string> = new Set(["hourly", "daily", "weekly"]);

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    console.error("[cron/sync-feeds] Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const rawFrequency = searchParams.get("frequency") || "hourly";
    const frequency: ValidFrequency = VALID_FREQUENCIES.has(rawFrequency)
      ? (rawFrequency as ValidFrequency)
      : "hourly";

    console.log(`[cron/sync-feeds] Starting feed sync (frequency=${frequency})...`);

    // Fetch active feeds matching the requested frequency
    const feedsSnap = await adminDb
      .collection("rssFeeds")
      .where("active", "==", true)
      .where("syncFrequency", "==", frequency)
      .get();

    if (feedsSnap.empty) {
      return NextResponse.json({
        synced: 0,
        totalJobsImported: 0,
        errors: [],
        timestamp: new Date().toISOString(),
      });
    }

    const feeds = feedsSnap.docs.map((doc) => ({
      ...(doc.data() as Omit<RSSFeedDoc, "id">),
      id: doc.id,
    }));

    const results: SyncResult[] = [];
    const errors: string[] = [];
    let totalJobsImported = 0;

    // Process feeds sequentially to avoid overwhelming downstream servers
    for (const feed of feeds) {
      const result = await syncSingleFeed(feed);
      results.push(result);

      if (result.error) {
        errors.push(`${feed.feedName}: ${result.error}`);
      } else {
        totalJobsImported += result.jobsImported;
      }
    }

    const feedCount = results.filter((r) => !r.error).length;

    // Log to cronLogs for monitoring
    try {
      await adminDb.collection("cronLogs").add({
        type: "feed_sync",
        frequency,
        feedsSynced: feedCount,
        totalJobsImported,
        errors,
        durationMs: Date.now() - startTime,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logErr) {
      console.error("[cron/sync-feeds] Failed to write cron log:", logErr);
    }

    console.log(
      `[cron/sync-feeds] Complete. Feeds: ${feedCount}, Jobs imported: ${totalJobsImported}`,
    );

    return NextResponse.json({
      synced: feedCount,
      totalJobsImported,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/sync-feeds] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process feed sync",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Sync a single feed
// ---------------------------------------------------------------------------

async function syncSingleFeed(feed: RSSFeedDoc): Promise<SyncResult> {
  const result: SyncResult = {
    feedId: feed.id,
    feedName: feed.feedName,
    jobsImported: 0,
  };

  try {
    // Fetch the feed with a timeout
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
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const xml = await response.text();
    const items = parseSimpleXml(xml);

    if (items.length === 0) {
      // Update lastSyncedAt even if no items found
      await adminDb!.collection("rssFeeds").doc(feed.id).update({
        lastSyncedAt: FieldValue.serverTimestamp(),
      });
      return result;
    }

    // Process each item from the feed
    for (const item of items) {
      try {
        const externalId = item.guid || item.id || item.link || "";
        const externalUrl = item.link || item.url || "";
        const title = item.title || "Untitled Position";
        const description = item.description || item.summary || item.content || "";

        if (!externalId && !externalUrl) continue;

        // Check for duplicates by externalId or externalUrl
        const duplicateQuery = externalId
          ? adminDb!
              .collection("jobs")
              .where("externalId", "==", externalId)
              .limit(1)
          : adminDb!
              .collection("jobs")
              .where("externalUrl", "==", externalUrl)
              .limit(1);

        const existingSnap = await duplicateQuery.get();

        if (!existingSnap.empty) {
          // Update existing job if configured to do so
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

        // Create new job document
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
            // Invalid date -- ignore
          }
        }

        await adminDb!.collection("jobs").add(jobData);
        result.jobsImported++;
      } catch (itemErr) {
        console.error(
          `[cron/sync-feeds] Error processing item in feed ${feed.id}:`,
          itemErr,
        );
      }
    }

    // Update feed metadata
    await adminDb!.collection("rssFeeds").doc(feed.id).update({
      lastSyncedAt: FieldValue.serverTimestamp(),
      totalJobsImported: (feed.totalJobsImported || 0) + result.jobsImported,
    });

    // Log individual feed sync
    try {
      await adminDb!.collection("cronLogs").add({
        type: "feed_sync",
        feedId: feed.id,
        frequency: feed.syncFrequency,
        jobsImported: result.jobsImported,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {
      // Non-critical -- do not block sync
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;
    console.error(`[cron/sync-feeds] Error syncing feed ${feed.id}:`, message);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Simplified XML parser -- no external dependencies
// ---------------------------------------------------------------------------

function parseSimpleXml(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item: Record<string, string> = {};
    const content = match[1];
    const fieldRegex = /<(\w+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(content)) !== null) {
      item[fieldMatch[1]] = fieldMatch[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    }

    items.push(item);
  }

  return items;
}

// ---------------------------------------------------------------------------
// Strip CDATA wrappers from a string
// ---------------------------------------------------------------------------

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}
