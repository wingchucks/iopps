import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FEED_FETCH_TIMEOUT_MS = 15_000;
// ---------------------------------------------------------------------------
// GET /api/cron/sync-feeds — Automated daily feed sync (Vercel Cron)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Vercel Cron sends CRON_SECRET automatically if set.
  // In production, also allow requests without secret for manual triggers.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(feedUrl, {
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
          const errorMsg = `HTTP ${response.status}`;
          await adminDb.collection("rssFeeds").doc(feed.id).update({
            lastSyncError: errorMsg,
            lastSyncedAt: FieldValue.serverTimestamp(),
          });
          results.push({ feedId: feed.id, feedName: feed.feedName, jobsImported: 0, error: errorMsg });
          continue;
        }

        const responseText = await response.text();
        const feedType = (feed as Record<string, unknown>).feedType as string || "xml";
        const items = feedType === "oracle-hcm"
          ? parseOracleHcm(responseText)
          : feedType === "adp"
            ? parseAdp(responseText)
            : parseSimpleXml(responseText);
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
            };

            if (item.pubDate) {
              try {
                jobData.publishedAt = new Date(item.pubDate);
              } catch {
                // ignore
              }
            }

            await adminDb.collection("jobs").add(jobData);
            jobsImported++;
          } catch (itemErr) {
            console.error(`[cron/sync-feeds] Error processing item:`, itemErr);
          }
        }

        await adminDb.collection("rssFeeds").doc(feed.id).update({
          lastSyncedAt: FieldValue.serverTimestamp(),
          lastSyncError: null,
          totalJobsImported: (feed.totalJobsImported || 0) + jobsImported,
        });

        results.push({ feedId: feed.id, feedName: feed.feedName, jobsImported });
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
      success: true,
      feedsProcessed: feedsSnap.size,
      results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[cron/sync-feeds] Error:", err);
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// XML parser — supports both <item> (RSS) and <job> (SmartJobBoard) tags
// ---------------------------------------------------------------------------

function parseSimpleXml(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
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

// ---------------------------------------------------------------------------
// Oracle HCM parser — handles recruitingCEJobRequisitions JSON response
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ADP Workforce Now parser
// ---------------------------------------------------------------------------

function parseAdp(text: string): Array<Record<string, string>> {
  try {
    const json = JSON.parse(text);
    const requisitions = json.jobRequisitions || [];
    return requisitions.map((req: Record<string, unknown>) => {
      const itemID = String(req.itemID || "");
      const cid = (req as Record<string, unknown>).clientRequisitionID || "";
      return {
        title: String(req.requisitionTitle || ""),
        guid: itemID,
        link: `https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=${cid}&jobId=${itemID}&lang=en_CA&source=CC2`,
        pubDate: String((req.postDate as string)?.substring(0, 10) || ""),
        description: "",
        location: "Saskatoon, SK",
      };
    });
  } catch {
    return [];
  }
}

function parseOracleHcm(text: string): Array<Record<string, string>> {
  try {
    const json = JSON.parse(text);
    const requisitions = json.items?.[0]?.requisitionList || [];
    return requisitions.map((req: Record<string, unknown>) => ({
      title: String(req.Title || ""),
      guid: String(req.Id || ""),
      link: `https://iaayzv.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/SIGA/job/${req.Id}`,
      pubDate: String(req.PostedDate || ""),
      description: String(req.ShortDescriptionStr || ""),
      location: String(req.PrimaryLocation || "Canada"),
    }));
  } catch {
    return [];
  }
}
