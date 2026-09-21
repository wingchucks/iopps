import { createImportedJobOnce, feedImportIdentity, importedJobCandidateSelector } from "@/lib/server/feed-import-identity";
import { prepareImportedDescription, withImportedLabelQuality } from "@/lib/server/import-content-quality";
import { missingSourceJobIds, expirationPatch, sourceLifecyclePatch } from "@/lib/server/job-expiration";
import { loadFeedItems, stripCdata } from "@/lib/server/feed-source";
import { sourcePostingDatePatch, sourcePublishedAtPatch } from "@/lib/server/source-posting-date";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";
import { fetchImportedDescriptionPatch, normalizeImportedDescription } from "@/lib/server/imported-job-descriptions";
import { updateImportedJobWithEditorialGuard } from "@/lib/server/job-cleanup-guards";

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
    const selectExistingJob = importedJobCandidateSelector(existingJobs.docs, feed.id);
    const seen = new Set<string>();
    let jobsUpdated = 0;
    let jobsFailed = 0;
    let jobsImported = 0;

    for (const item of items) {
      try {
        const externalId = item.guid || item.id || item.link || "";
        const externalUrl = item.link || item.url || "";
        const key = feedImportIdentity({ feedId: feed.id, employerId: feed.employerId, title: item.title, location: item.location || "Canada", externalId, externalUrl, publishedAt: item.pubDate });
        if (!key || !item.title) throw new Error("Feed job is missing identity or title");
        if (seen.has(key)) continue;
        seen.add(key);
        const title = item.title;
        const feedDescription = item.description || item.summary || item.content || "";
        const feedContent = prepareImportedDescription(stripCdata(feedDescription), undefined, { title: item.title, location: item.location, employerName: feed.employerName });
        const normalizedFeedDescription = feedContent.description;
        const descriptionPatch = await fetchImportedDescriptionPatch({
          description: normalizedFeedDescription,
          externalUrl,
          externalId,
          feedUrl: feed.feedUrl,
        });
        if (descriptionPatch) descriptionPatch.importContentQuality = withImportedLabelQuality(descriptionPatch.importContentQuality || feedContent.importContentQuality, { title: item.title, location: item.location, employerName: feed.employerName });
        const resolvedDescription = descriptionPatch?.description ?? normalizedFeedDescription;

        if (!externalId && !externalUrl) continue;

        const existingDoc = selectExistingJob({ externalId, externalUrl, location: item.location || "Canada", publishedAt: item.pubDate });
        if (existingDoc) {
          const lifecycle = sourceLifecyclePatch(item, existingDoc.data());
              const identity = { feedId: feed.id, externalId: externalId || null, externalUrl: externalUrl || null };
          if (feed.updateExistingJobs || (feedType === "dayforce" && feed.updateExistingJobs !== false)) {
            const appliedPatch = await updateImportedJobWithEditorialGuard(adminDb, existingDoc.ref, { ...identity, title, location: item.location || "Canada", ...feedContent, description: resolvedDescription, descriptionFormat: "plain-text", ...(descriptionPatch || {}), ...lifecycle, ...sourcePostingDatePatch(item.sourcePostingDate), updatedAt: FieldValue.serverTimestamp() }, normalizeImportedDescription);
            if (Object.keys(appliedPatch).length) jobsUpdated++;
          } else if (Object.keys(lifecycle).length || (feedType === "dayforce" && existingDoc.get("feedId") !== feed.id)) {
            await updateImportedJobWithEditorialGuard(adminDb, existingDoc.ref, {...identity,...lifecycle}, normalizeImportedDescription);
          }
          continue;
        }

        if (sourceLifecyclePatch(item).active === false || descriptionPatch?.active === false || descriptionPatch?.status === "expired") {
          continue;
        }

        const jobData: Record<string, unknown> = {
          title,
          ...feedContent, description: resolvedDescription, descriptionFormat: "plain-text",
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
          ...sourcePostingDatePatch(item.sourcePostingDate),
        };

        Object.assign(jobData, sourcePublishedAtPatch(item.pubDate));

        if (await createImportedJobOnce(adminDb, jobData)) jobsImported++;
      } catch (itemErr) {
        jobsFailed++;
        console.error(`[admin/feeds/sync] Error processing item:`, itemErr);
      }
    }

        const missingIds = missingSourceJobIds(existingJobs.docs.map(d=>({id:d.id,...d.data()})), items, {id:feed.id,employerId:feed.employerId,feedType,feedUrl:feed.feedUrl!}, jobsFailed, (feed as Record<string, unknown>).lastSyncItemCount === 0 && (feed as Record<string, unknown>).lastSyncJobsFailed === 0 && !(feed as Record<string, unknown>).lastSyncError);
        let jobsExpired = 0;
                for (const id of missingIds) {
                  const appliedPatch = await updateImportedJobWithEditorialGuard(adminDb, adminDb.collection("jobs").doc(id), expirationPatch("removed_from_source"), normalizeImportedDescription);
                  if (Object.keys(appliedPatch).length) jobsExpired++;
                }
    // Update feed metadata
    await adminDb.collection("rssFeeds").doc(feedId).update({
      lastSyncedAt: FieldValue.serverTimestamp(),
      lastSyncError: jobsFailed ? `${jobsFailed} job(s) failed during sync` : null,
      lastSyncItemCount: items.length,
          lastSyncJobsExpired: jobsExpired,
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
