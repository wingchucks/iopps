import { NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for processing multiple feeds

interface RSSFeedConfig {
  id: string;
  employerId: string;
  employerName?: string;
  feedUrl: string;
  feedName: string;
  active: boolean;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
  totalJobsImported?: number;
  jobExpiration?: {
    type: "days" | "feed" | "never";
    daysAfterImport?: number;
  };
  utmTrackingTag?: string;
  noIndexByGoogle?: boolean;
  updateExistingJobs?: boolean;
}

interface JobXML {
  title: string[];
  description: string[];
  city: string[];
  state: string[];
  country: string[];
  remote: string[];
  applyurl: string[];
  company: string[];
  expirationdate: string[];
  category: string[];
  url: string[];
  date: string[];
}

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no CRON_SECRET configured (development) or if it matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized cron request - invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Firebase Admin is initialized
  if (!db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    // Get frequency from query parameter (defaults to all frequencies)
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency") as
      | "hourly"
      | "daily"
      | "weekly"
      | null;

    console.log(
      `Starting feed sync cron job${frequency ? ` for frequency: ${frequency}` : " for all frequencies"}`
    );

    // Query active feeds with matching sync frequency
    let query = db.collection("rssFeeds").where("active", "==", true);

    if (frequency) {
      // If frequency is specified, only get feeds with that exact frequency
      query = query.where("syncFrequency", "==", frequency);
    }
    // If no frequency specified, get all active feeds and filter out manual ones below

    const feedsSnapshot = await query.get();

    if (feedsSnapshot.empty) {
      console.log("No active feeds found for syncing");
      return NextResponse.json({
        success: true,
        feedsSynced: 0,
        message: "No active feeds to sync",
      });
    }

    let feeds = feedsSnapshot.docs.map((doc) => doc.data() as RSSFeedConfig);

    // Filter out manual feeds if no specific frequency was requested
    if (!frequency) {
      feeds = feeds.filter((feed) => feed.syncFrequency !== "manual");
    }

    console.log(`Found ${feeds.length} feed(s) to sync`);

    const results = {
      feedsSynced: 0,
      feedsFailed: 0,
      totalJobsImported: 0,
      totalJobsUpdated: 0,
      totalJobsExpired: 0,
      errors: [] as string[],
    };

    // Process each feed
    for (const feed of feeds) {
      try {
        console.log(`Syncing feed: ${feed.feedName} (${feed.id})`);

        const syncResult = await syncFeed(feed);

        if (syncResult.success) {
          results.feedsSynced++;
          results.totalJobsImported += syncResult.jobsImported;
          results.totalJobsUpdated += syncResult.jobsUpdated;
          results.totalJobsExpired += syncResult.jobsExpired;

          console.log(
            `✓ ${feed.feedName}: imported ${syncResult.jobsImported}, updated ${syncResult.jobsUpdated}, expired ${syncResult.jobsExpired}`
          );
        } else {
          results.feedsFailed++;
          results.errors.push(`${feed.feedName}: ${syncResult.error}`);
          console.error(`✗ ${feed.feedName}: ${syncResult.error}`);
        }
      } catch (error) {
        results.feedsFailed++;
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        results.errors.push(`${feed.feedName}: ${errorMsg}`);
        console.error(`Error syncing feed ${feed.feedName}:`, error);
      }
    }

    console.log(
      `Feed sync cron completed. Synced: ${results.feedsSynced}, Failed: ${results.feedsFailed}, Total jobs imported: ${results.totalJobsImported}`
    );

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Feed sync cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to process feed sync",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function syncFeed(feed: RSSFeedConfig): Promise<{
  success: boolean;
  jobsImported: number;
  jobsUpdated: number;
  jobsExpired: number;
  jobsSkipped: number;
  error?: string;
}> {
  try {
    // Fetch XML from URL
    const response = await fetch(feed.feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse XML
    const parsed = await parseStringPromise(xmlText);
    const jobs = parsed.source?.job || [];

    const newJobs: any[] = [];
    const updatedJobs: any[] = [];
    const errors: string[] = [];
    let skipped = 0;

    // Track all current feed URLs for "feed" expiration type
    const currentFeedUrls = new Set<string>();

    for (const jobXML of jobs) {
      try {
        const job = jobXML as JobXML;

        // Extract values (XML parser returns arrays)
        const applyUrl = job.applyurl?.[0] || "";
        const title = job.title?.[0] || "";

        if (!applyUrl) {
          errors.push(`Skipping job "${title}": No application URL`);
          continue;
        }

        // Track this URL for feed-based expiration
        currentFeedUrls.add(applyUrl);

        // Apply UTM tracking tag if configured
        let finalApplyUrl = applyUrl;
        if (feed.utmTrackingTag) {
          const separator = applyUrl.includes("?") ? "&" : "?";
          finalApplyUrl = `${applyUrl}${separator}${feed.utmTrackingTag}`;
        }

        // Check if job already exists by applyurl
        const existing = await db!
          .collection("jobs")
          .where("applicationLink", "==", applyUrl)
          .limit(1)
          .get();

        // Also check with UTM tag version
        let existingWithUtm = { empty: true, docs: [] as any[] };
        if (feed.utmTrackingTag && applyUrl !== finalApplyUrl) {
          existingWithUtm = await db!
            .collection("jobs")
            .where("applicationLink", "==", finalApplyUrl)
            .limit(1)
            .get();
        }

        const existingDoc = !existing.empty
          ? existing.docs[0]
          : !existingWithUtm.empty
            ? existingWithUtm.docs[0]
            : null;

        if (existingDoc) {
          if (feed.updateExistingJobs) {
            // Update existing job
            const updateData: any = {
              title: title,
              description: decode(job.description?.[0] || ""),
              updatedAt: new Date(),
              importedFrom: feed.id,
            };

            // Update location
            const city = job.city?.[0] || "";
            const state = job.state?.[0] || "";
            let location = city;
            if (state) {
              location = location ? `${location}, ${state}` : state;
            }
            if (location) updateData.location = location;

            // Update expiration if set
            if (
              feed.jobExpiration?.type === "days" &&
              feed.jobExpiration.daysAfterImport
            ) {
              const expirationDate = new Date();
              expirationDate.setDate(
                expirationDate.getDate() + feed.jobExpiration.daysAfterImport
              );
              updateData.closingDate = expirationDate.toISOString();
            }

            await existingDoc.ref.update(updateData);
            updatedJobs.push({ id: existingDoc.id, title });
          } else {
            skipped++;
          }
          continue;
        }

        // Build location string
        const city = job.city?.[0] || "";
        const state = job.state?.[0] || "";
        let location = city;
        if (state) {
          location = location ? `${location}, ${state}` : state;
        }
        if (!location) location = "Remote";

        // Parse remote flag
        const remoteFlag = job.remote?.[0]?.toLowerCase() === "yes";

        // Decode HTML in description
        const description = decode(job.description?.[0] || "");

        // Parse expiration date - use feed config or XML data
        let closingDate = null;
        if (
          feed.jobExpiration?.type === "days" &&
          feed.jobExpiration.daysAfterImport
        ) {
          const expirationDate = new Date();
          expirationDate.setDate(
            expirationDate.getDate() + feed.jobExpiration.daysAfterImport
          );
          closingDate = expirationDate.toISOString();
        } else if (job.expirationdate?.[0]) {
          try {
            closingDate = new Date(job.expirationdate[0]).toISOString();
          } catch {
            // Invalid date, leave as null
          }
        }

        // Create job document
        const jobData: any = {
          employerId: feed.employerId,
          employerName: job.company?.[0] || feed.employerName,
          title: title,
          description: description,
          location: location,
          employmentType: "Full-time", // Default, could be enhanced
          remoteFlag: remoteFlag,
          applicationLink: finalApplyUrl,
          originalApplicationLink: applyUrl, // Store original for deduplication
          closingDate: closingDate,
          active: true,
          createdAt: new Date(),
          viewsCount: 0,
          applicationsCount: 0,
          // Track that this came from RSS
          importedFrom: feed.id,
          originalUrl: job.url?.[0] || applyUrl,
          // SmartJobBoard features
          noIndex: feed.noIndexByGoogle || false,
        };

        // Create job in Firestore
        const jobRef = await db!.collection("jobs").add(jobData);
        await jobRef.update({ id: jobRef.id });

        newJobs.push({ id: jobRef.id, title: jobData.title });
      } catch (itemError) {
        const jobTitle = jobXML.title?.[0] || "Unknown";
        const itemErrorMessage =
          itemError instanceof Error ? itemError.message : String(itemError);
        errors.push(`Error processing "${jobTitle}": ${itemErrorMessage}`);
      }
    }

    // Handle "feed" expiration type - expire jobs that are no longer in the feed
    let expiredJobs = 0;
    if (feed.jobExpiration?.type === "feed") {
      const existingFeedJobs = await db!
        .collection("jobs")
        .where("importedFrom", "==", feed.id)
        .where("active", "==", true)
        .get();

      for (const doc of existingFeedJobs.docs) {
        const jobData = doc.data();
        const originalLink =
          jobData.originalApplicationLink || jobData.applicationLink;

        // Check if this job's URL is still in the feed
        if (!currentFeedUrls.has(originalLink)) {
          await doc.ref.update({
            active: false,
            expiredAt: new Date(),
            expirationReason: "Removed from feed",
          });
          expiredJobs++;
        }
      }
    }

    // Update feed last synced time and stats
    await db!
      .collection("rssFeeds")
      .doc(feed.id)
      .update({
        lastSyncedAt: new Date(),
        syncErrors: errors.length > 0 ? errors : [],
        totalJobsImported: (feed.totalJobsImported || 0) + newJobs.length,
      });

    return {
      success: true,
      jobsImported: newJobs.length,
      jobsUpdated: updatedJobs.length,
      jobsExpired: expiredJobs,
      jobsSkipped: skipped,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      jobsImported: 0,
      jobsUpdated: 0,
      jobsExpired: 0,
      jobsSkipped: 0,
      error: errorMsg,
    };
  }
}
