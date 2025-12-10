import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";

// Mark this route as dynamic to prevent static analysis
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for processing multiple feeds

interface FieldMappings {
  jobIdOrUrl?: string;
  title?: string;
  description?: string;
  jobType?: string;
  category?: string;
  experience?: string;
  applyUrl?: string;
  expirationDate?: string;
  featured?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  remote?: string;
  salaryString?: string;
  salaryFrom?: string;
  salaryTo?: string;
  salaryPeriod?: string;
}

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
  fieldMappings?: FieldMappings;
}

// Helper function to extract a value from job XML using field mapping
function getFieldValue(job: any, fieldName: string | undefined, defaultFields: string[]): string {
  // If a custom mapping is provided, use it
  if (fieldName) {
    // Handle nested fields like "nested.field"
    if (fieldName.includes(".")) {
      const parts = fieldName.split(".");
      let value = job;
      for (const part of parts) {
        if (value && typeof value === "object") {
          value = value[part];
        } else {
          break;
        }
      }
      if (Array.isArray(value)) {
        return value[0] || "";
      }
      return value || "";
    }
    // Direct field access
    const value = job[fieldName];
    if (Array.isArray(value)) {
      return value[0] || "";
    }
    return value || "";
  }

  // Fall back to default field names
  for (const defaultField of defaultFields) {
    const value = job[defaultField];
    if (value) {
      if (Array.isArray(value)) {
        return value[0] || "";
      }
      return value || "";
    }
  }
  return "";
}

// Helper function to normalize job type strings
function normalizeJobType(type: string): string {
  if (!type) return "Full-time";

  const lower = type.toLowerCase().trim();

  if (lower.includes("full") || lower === "ft" || lower === "f") return "Full-time";
  if (lower.includes("part") || lower === "pt" || lower === "p") return "Part-time";
  if (lower.includes("contract") || lower === "c") return "Contract";
  if (lower.includes("temp") || lower === "t") return "Temporary";
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("freelance")) return "Freelance";
  if (lower.includes("seasonal")) return "Seasonal";

  // Return the original if we can't normalize it
  return type;
}

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for security - REQUIRED in all environments
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
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
    const mappings = feed.fieldMappings || {};

    // Fetch XML from URL
    const response = await fetch(feed.feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse XML with XXE protection
    const parsed = await parseStringPromise(xmlText, {
      explicitArray: true,
      ignoreAttrs: false,
      // XXE protection settings
      strict: true,
    });

    // Find jobs in various common XML structures
    let jobs: any[] = [];
    if (parsed.source?.job) {
      jobs = parsed.source.job;
    } else if (parsed.jobs?.job) {
      jobs = parsed.jobs.job;
    } else if (parsed.rss?.channel?.[0]?.item) {
      jobs = parsed.rss.channel[0].item;
    } else if (parsed.feed?.entry) {
      jobs = parsed.feed.entry;
    } else if (parsed.JobPositionPostings?.JobPositionPosting) {
      jobs = parsed.JobPositionPostings.JobPositionPosting;
    } else {
      // Try to find any array of items
      const findJobsArray = (obj: any, depth = 0): any[] => {
        if (depth > 5) return [];
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
          return obj;
        }
        if (typeof obj === "object" && obj !== null) {
          for (const key of Object.keys(obj)) {
            const result = findJobsArray(obj[key], depth + 1);
            if (result.length > 0) return result;
          }
        }
        return [];
      };
      jobs = findJobsArray(parsed);
    }

    const newJobs: any[] = [];
    const updatedJobs: any[] = [];
    const errors: string[] = [];
    let skipped = 0;

    // Track all current feed URLs for "feed" expiration type
    const currentFeedUrls = new Set<string>();

    for (const job of jobs) {
      try {
        // Extract values using field mappings with fallbacks
        const title = getFieldValue(job, mappings.title, ["title", "jobtitle", "position"]);
        const description = getFieldValue(job, mappings.description, ["description", "jobdescription", "content", "body"]);
        const applyUrl = getFieldValue(job, mappings.applyUrl, ["applyurl", "applicationurl", "url", "link"]);
        const jobIdOrUrl = getFieldValue(job, mappings.jobIdOrUrl, ["id", "jobid", "url", "applyurl"]);

        // Location fields
        const locationString = getFieldValue(job, mappings.location, ["location", "joblocation"]);
        const city = getFieldValue(job, mappings.city, ["city", "locality"]);
        const state = getFieldValue(job, mappings.state, ["state", "province", "region"]);
        const country = getFieldValue(job, mappings.country, ["country"]);
        const remote = getFieldValue(job, mappings.remote, ["remote", "isremote"]);

        // Other fields
        const jobType = getFieldValue(job, mappings.jobType, ["jobtype", "employmenttype", "type"]);
        const category = getFieldValue(job, mappings.category, ["category", "department"]);
        const expirationDate = getFieldValue(job, mappings.expirationDate, ["expirationdate", "expires", "closingdate"]);

        // Salary fields
        const salaryString = getFieldValue(job, mappings.salaryString, ["salary", "compensation"]);
        const salaryFrom = getFieldValue(job, mappings.salaryFrom, ["salaryfrom", "salarymin", "minsalary"]);
        const salaryTo = getFieldValue(job, mappings.salaryTo, ["salaryto", "salarymax", "maxsalary"]);
        const salaryPeriod = getFieldValue(job, mappings.salaryPeriod, ["salaryperiod", "payperiod"]);

        // Use jobIdOrUrl or applyUrl for deduplication
        const dedupeUrl = applyUrl || jobIdOrUrl;

        if (!dedupeUrl) {
          errors.push(`Skipping job "${title || "Unknown"}": No application URL or job ID`);
          continue;
        }

        // Track this URL for feed-based expiration
        currentFeedUrls.add(dedupeUrl);

        // Apply UTM tracking tag if configured
        let finalApplyUrl = applyUrl || dedupeUrl;
        if (feed.utmTrackingTag && finalApplyUrl) {
          const separator = finalApplyUrl.includes("?") ? "&" : "?";
          finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
        }

        // Check if job already exists by applyurl
        const existing = await db!
          .collection("jobs")
          .where("applicationLink", "==", dedupeUrl)
          .limit(1)
          .get();

        // Also check with UTM tag version
        let existingWithUtm = { empty: true, docs: [] as any[] };
        if (feed.utmTrackingTag && dedupeUrl !== finalApplyUrl) {
          existingWithUtm = await db!
            .collection("jobs")
            .where("applicationLink", "==", finalApplyUrl)
            .limit(1)
            .get();
        }

        // Also check by originalApplicationLink
        let existingByOriginal = { empty: true, docs: [] as any[] };
        existingByOriginal = await db!
          .collection("jobs")
          .where("originalApplicationLink", "==", dedupeUrl)
          .limit(1)
          .get();

        const existingDoc = !existing.empty
          ? existing.docs[0]
          : !existingWithUtm.empty
            ? existingWithUtm.docs[0]
            : !existingByOriginal.empty
              ? existingByOriginal.docs[0]
              : null;

        if (existingDoc) {
          if (feed.updateExistingJobs) {
            // Update existing job
            const updateData: any = {
              title: title || existingDoc.data().title,
              description: decode(description || ""),
              updatedAt: new Date(),
              importedFrom: feed.id,
            };

            // Update location
            let location = locationString || city;
            if (state) {
              location = location ? `${location}, ${state}` : state;
            }
            if (location) updateData.location = location;

            // Update job type if provided
            if (jobType) updateData.employmentType = normalizeJobType(jobType);

            // Update category if provided
            if (category) updateData.category = category;

            // Update expiration if set
            if (
              feed.jobExpiration?.type === "days" &&
              feed.jobExpiration.daysAfterImport
            ) {
              const expDate = new Date();
              expDate.setDate(
                expDate.getDate() + feed.jobExpiration.daysAfterImport
              );
              updateData.closingDate = expDate.toISOString();
            }

            await existingDoc.ref.update(updateData);
            updatedJobs.push({ id: existingDoc.id, title });
          } else {
            skipped++;
          }
          continue;
        }

        // Build location string
        let location = locationString || city;
        if (state) {
          location = location ? `${location}, ${state}` : state;
        }
        if (country && !location) {
          location = country;
        }
        if (!location) location = "Location not specified";

        // Parse remote flag
        const remoteFlag = remote?.toLowerCase() === "yes" || remote?.toLowerCase() === "true" || remote === "1";

        // Decode HTML in description
        const decodedDescription = decode(description || "");

        // Parse expiration date - use feed config or XML data
        let closingDate = null;
        if (
          feed.jobExpiration?.type === "days" &&
          feed.jobExpiration.daysAfterImport
        ) {
          const expDate = new Date();
          expDate.setDate(
            expDate.getDate() + feed.jobExpiration.daysAfterImport
          );
          closingDate = expDate.toISOString();
        } else if (expirationDate) {
          try {
            closingDate = new Date(expirationDate).toISOString();
          } catch {
            // Invalid date, leave as null
          }
        }

        // Build salary information
        let salary: { min?: number; max?: number; period?: string; display?: string } | null = null;
        if (salaryString) {
          salary = { display: salaryString };
        } else if (salaryFrom || salaryTo) {
          salary = {};
          if (salaryFrom) salary.min = parseFloat(salaryFrom) || undefined;
          if (salaryTo) salary.max = parseFloat(salaryTo) || undefined;
          if (salaryPeriod) salary.period = salaryPeriod;
        }

        // Normalize employment type
        const employmentType = normalizeJobType(jobType) || "Full-time";

        // Create job document
        const jobData: any = {
          employerId: feed.employerId,
          employerName: feed.employerName,
          title: title || "Untitled Position",
          description: decodedDescription,
          location: location,
          employmentType: employmentType,
          remoteFlag: remoteFlag,
          applicationLink: finalApplyUrl,
          originalApplicationLink: dedupeUrl, // Store original for deduplication
          closingDate: closingDate,
          active: true,
          createdAt: new Date(),
          viewsCount: 0,
          applicationsCount: 0,
          // Track that this came from RSS
          importedFrom: feed.id,
          originalUrl: dedupeUrl,
          // SmartJobBoard features
          noIndex: feed.noIndexByGoogle || false,
        };

        // Add optional fields if present
        if (category) jobData.category = category;
        if (salary) jobData.salary = salary;

        // Create job in Firestore
        const jobRef = await db!.collection("jobs").add(jobData);
        await jobRef.update({ id: jobRef.id });

        newJobs.push({ id: jobRef.id, title: jobData.title });
      } catch (itemError) {
        const jobTitle = getFieldValue(job, mappings.title, ["title"]) || "Unknown";
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
