import { missingSourceJobIds, expirationPatch, sourceLifecyclePatch } from "@/lib/server/job-expiration";
import { loadFeedItems, feedJobKey, stripCdata } from "@/lib/server/feed-source";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;


// ---------------------------------------------------------------------------
// GET /api/cron/sync-feeds — Automated daily feed sync (Vercel Cron)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const startTime = Date.now();
  const results: Array<{ feedId: string; feedName: string; jobsImported: number; error?: string }> = [];

  try {
    // Get all active feeds
    const feedsSnap = await adminDb.collection("rssFeeds").where("active", "==", true).get();

    for (const feedDoc of feedsSnap.docs) {
      const feed = { id: feedDoc.id, ...feedDoc.data() } as {
        id: string;
        feedUrl?: string;
        feedName: string;
        employerId: string;
        employerName?: string;
        updateExistingJobs?: boolean;
        totalJobsImported?: number;
      };

      const feedUrl = feed.feedUrl;
      if (!feedUrl) {
        results.push({ feedId: feed.id, feedName: feed.feedName, jobsImported: 0, error: "No feedUrl" });
        continue;
      }

      try {
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
              feedUrl,
            });
            const resolvedDescription = descriptionPatch?.description ?? normalizedFeedDescription;

            if (!externalId && !externalUrl) continue;

            const existingDoc = byId.get(externalId) || byUrl.get(feedJobKey(externalUrl));
            if (existingDoc) {
              const lifecycle = sourceLifecyclePatch(item, existingDoc.data());
              const identity = { feedId: feed.id, externalId: externalId || null, externalUrl: externalUrl || null };
              if (feed.updateExistingJobs || (feedType === "dayforce" && feed.updateExistingJobs !== false)) {
                await existingDoc.ref.update({ ...identity, title, location: item.location || "Canada", description: resolvedDescription, ...(descriptionPatch || {}), ...lifecycle, updatedAt: FieldValue.serverTimestamp() });
                jobsUpdated++;
              } else if (Object.keys(lifecycle).length || (feedType === "dayforce" && existingDoc.get("feedId") !== feed.id)) {
                await existingDoc.ref.update({...identity,...lifecycle});
              }
              continue;
            }

            if (sourceLifecyclePatch(item).active === false || descriptionPatch?.active === false || descriptionPatch?.status === "expired") {
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
              ...sourceLifecyclePatch(item),
            };

            if (item.pubDate) {
              try {
                const publishedAt = new Date(item.pubDate);
                if (!Number.isNaN(publishedAt.getTime())) jobData.publishedAt = publishedAt;
              } catch {
                // ignore
              }
            }

            await adminDb.collection("jobs").add(jobData);
            jobsImported++;
          } catch (itemErr) {
            jobsFailed++;
            console.error(`[cron/sync-feeds] Error processing item:`, itemErr);
          }
        }

        const missingIds = missingSourceJobIds(existingJobs.docs.map(d=>({id:d.id,...d.data()})), items, {id:feed.id,employerId:feed.employerId,feedType,feedUrl:feed.feedUrl!}, jobsFailed, (feed as Record<string, unknown>).lastSyncItemCount === 0 && (feed as Record<string, unknown>).lastSyncJobsFailed === 0 && !(feed as Record<string, unknown>).lastSyncError);
        for (let start = 0; start < missingIds.length; start += 400) {
          const batch = adminDb.batch();
          for (const id of missingIds.slice(start,start+400)) batch.update(adminDb.collection("jobs").doc(id),expirationPatch("removed_from_source"));
          await batch.commit();
        }
        await adminDb.collection("rssFeeds").doc(feed.id).update({
          lastSyncedAt: FieldValue.serverTimestamp(),
          lastSyncError: jobsFailed ? `${jobsFailed} job(s) failed during sync` : null,
          lastSyncItemCount: items.length,
          lastSyncJobsExpired: missingIds.length,
          lastSyncJobsUpdated: jobsUpdated,
          lastSyncJobsFailed: jobsFailed,
          totalJobsImported: (feed.totalJobsImported || 0) + jobsImported,
        });

        results.push({ feedId: feed.id, feedName: feed.feedName, jobsImported, ...(jobsFailed ? { error: `${jobsFailed} job(s) failed during sync` } : {}) });
      } catch (feedErr) {
        const errMsg = feedErr instanceof Error ? feedErr.message : String(feedErr);
        results.push({ feedId: feed.id, feedName: feed.feedName, jobsImported: 0, error: errMsg });

        try {
          await adminDb.collection("rssFeeds").doc(feed.id).update({
            lastSyncError: errMsg,
            lastSyncedAt: FieldValue.serverTimestamp(),
          });
        } catch {
          // non-critical
        }
      }
    }

    // Log the cron run
    await adminDb.collection("cronLogs").add({
      type: "feed_sync",
      frequency: "daily",
      feedCount: feedsSnap.size,
      results,
      durationMs: Date.now() - startTime,
      triggeredBy: "cron",
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: results.every(result => !result.error),
      feedsProcessed: feedsSnap.size,
      results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[cron/sync-feeds] Error:", err);
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 });
  }
}
