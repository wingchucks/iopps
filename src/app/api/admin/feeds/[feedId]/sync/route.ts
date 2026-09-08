import { loadFeedItems, feedJobKey, stripCdata } from "@/lib/server/feed-source";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;



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

    const feedType = (feed as Record<string, unknown>).feedType as string || "xml";
    const items = await loadFeedItems(feed.feedUrl!, feedType);
    // Scope identity matching to this employer, including historical Dayforce apply URLs.
    const existingJobs = await adminDb.collection("jobs").where("employerId", "==", feed.employerId).get();
    const byId = new Map(existingJobs.docs.filter(d => d.get("externalId") && d.get("feedId") === feed.id).map(d => [String(d.get("externalId")), d]));
    const byUrl = new Map(existingJobs.docs.flatMap(d => [d.get("externalUrl"), d.get("applyUrl"), d.get("applicationUrl")].map(value => [feedJobKey(value), d] as const).filter(([key]) => key)));
    const seen = new Set<string>();
    let jobsUpdated = 0;
    let jobsFailed = 0;
    let jobsImported = 0;

    for (const item of items) {
      try {
        const externalId = item.guid || item.id || item.link || "";
        const externalUrl = item.link || item.url || "";
        const key = feedJobKey(externalUrl) || externalId;
        if (!key || !item.title) throw new Error("Feed job is missing identity or title");
        if (seen.has(key)) continue;
        seen.add(key);
        const title = item.title;
        const feedDescription = item.description || item.summary || item.content || "";
        const normalizedFeedDescription = normalizeImportedDescription(stripCdata(feedDescription));
        const descriptionPatch = await fetchImportedDescriptionPatch({
          description: normalizedFeedDescription,
          externalUrl,
          externalId,
          feedUrl: feed.feedUrl,
        });
        const resolvedDescription = descriptionPatch?.description ?? normalizedFeedDescription;

        if (!externalId && !externalUrl) continue;

        const existingDoc = byId.get(externalId) || byUrl.get(feedJobKey(externalUrl));
        if (existingDoc) {
          const identity = { feedId: feed.id, externalId: externalId || null, externalUrl: externalUrl || null };
          if (feed.updateExistingJobs || (feedType === "dayforce" && feed.updateExistingJobs !== false)) {
            await existingDoc.ref.update({ ...identity, title, location: item.location || "Canada", description: resolvedDescription, ...(descriptionPatch || {}), updatedAt: FieldValue.serverTimestamp() });
            jobsUpdated++;
          } else if (feedType === "dayforce" && existingDoc.get("feedId") !== feed.id) {
            await existingDoc.ref.update(identity);
          }
          continue;
        }

        if (descriptionPatch?.active === false || descriptionPatch?.status === "expired") {
          continue;
        }

        const jobData: Record<string, unknown> = {
          title,
          description: resolvedDescription,
          status: "active",
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
          ...(descriptionPatch ? descriptionPatch : {}),
        };

        if (item.pubDate) {
          try {
            const publishedAt = new Date(item.pubDate);
            if (!Number.isNaN(publishedAt.getTime())) jobData.publishedAt = publishedAt;
          } catch {
            // ignore invalid date
          }
        }

        await adminDb.collection("jobs").add(jobData);
        jobsImported++;
      } catch (itemErr) {
        jobsFailed++;
        console.error(`[admin/feeds/sync] Error processing item:`, itemErr);
      }
    }

    // Update feed metadata
    await adminDb.collection("rssFeeds").doc(feedId).update({
      lastSyncedAt: FieldValue.serverTimestamp(),
      lastSyncError: jobsFailed ? `${jobsFailed} job(s) failed during sync` : null,
      lastSyncItemCount: items.length,
      lastSyncJobsUpdated: jobsUpdated,
      lastSyncJobsFailed: jobsFailed,
      totalJobsImported: (feed.totalJobsImported || 0) + jobsImported,
    });

    // Log the sync
    await adminDb.collection("cronLogs").add({
      type: "feed_sync",
      feedId: feed.id,
      frequency: "manual",
      jobsImported,
      jobsUpdated,
      jobsFailed,
      durationMs: Date.now() - startTime,
      triggeredBy: auth.decodedToken?.uid || "admin",
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: jobsFailed === 0,
      jobsUpdated,
      jobsFailed,
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
