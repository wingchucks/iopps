import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";
import { scrapeJobsFromHtml, isHtmlContent, ScrapedJob } from "@/lib/html-job-scraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface FieldMappings {
  jobIdOrUrl?: string;
  title?: string;
  description?: string;
  jobType?: string;
  category?: string;
  applyUrl?: string;
  expirationDate?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
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
  feedType?: "xml" | "html";
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency") as "hourly" | "daily" | "weekly" | null;

    let query = db.collection("rssFeeds").where("active", "==", true);

    if (frequency) {
      query = query.where("syncFrequency", "==", frequency);
    }

    const feedsSnapshot = await query.get();

    if (feedsSnapshot.empty) {
      return NextResponse.json({ success: true, feedsSynced: 0, message: "No active feeds to sync" });
    }

    let feeds = feedsSnapshot.docs.map((doc) => doc.data() as RSSFeedConfig);

    if (!frequency) {
      feeds = feeds.filter((feed) => feed.syncFrequency !== "manual");
    }

    const results = {
      feedsSynced: 0,
      feedsFailed: 0,
      totalJobsImported: 0,
      totalJobsUpdated: 0,
      totalJobsExpired: 0,
      errors: [] as string[],
    };

    for (const feed of feeds) {
      try {
        const syncResult = await syncFeed(feed);

        if (syncResult.success) {
          results.feedsSynced++;
          results.totalJobsImported += syncResult.jobsImported;
          results.totalJobsUpdated += syncResult.jobsUpdated;
          results.totalJobsExpired += syncResult.jobsExpired;
        } else {
          results.feedsFailed++;
          results.errors.push(`${feed.feedName}: ${syncResult.error}`);
        }
      } catch (error) {
        results.feedsFailed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${feed.feedName}: ${errorMsg}`);
      }
    }

    return NextResponse.json({ success: true, ...results, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process feed sync", details: error instanceof Error ? error.message : String(error) },
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
    const response = await fetch(feed.feedUrl, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const content = await response.text();

    // Determine feed type and process
    if (feed.feedType === "html" || isHtmlContent(content, contentType)) {
      return await processHtmlFeed(feed, content);
    } else {
      return await processXmlFeed(feed, content);
    }
  } catch (error) {
    return {
      success: false,
      jobsImported: 0,
      jobsUpdated: 0,
      jobsExpired: 0,
      jobsSkipped: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function processHtmlFeed(feed: RSSFeedConfig, html: string) {
  const mappings = feed.fieldMappings || {};
  const scrapeResult = scrapeJobsFromHtml(html, feed.feedUrl);

  const newJobs: any[] = [];
  const updatedJobs: any[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const currentFeedUrls = new Set<string>();

  for (const scrapedJob of scrapeResult.jobs) {
    try {
      const title = getMappedValue(scrapedJob, mappings.title, "title") || "Untitled Position";
      const description = getMappedValue(scrapedJob, mappings.description, "description") || "";
      const applyUrl = getMappedValue(scrapedJob, mappings.applyUrl, "applyUrl") ||
        getMappedValue(scrapedJob, mappings.applyUrl, "url") || "";
      const jobIdOrUrl = getMappedValue(scrapedJob, mappings.jobIdOrUrl, "jobId") ||
        getMappedValue(scrapedJob, mappings.jobIdOrUrl, "url") || applyUrl;
      const locationStr = getMappedValue(scrapedJob, mappings.location, "location") || "";
      const jobType = getMappedValue(scrapedJob, mappings.jobType, "jobType") || "";
      const category = getMappedValue(scrapedJob, mappings.category, "department") || "";
      const salaryStr = getMappedValue(scrapedJob, mappings.salaryString, "salary") || "";

      const dedupeUrl = applyUrl || jobIdOrUrl || title;

      if (!dedupeUrl) continue;

      currentFeedUrls.add(dedupeUrl);

      let finalApplyUrl = applyUrl;
      if (feed.utmTrackingTag && finalApplyUrl) {
        const separator = finalApplyUrl.includes("?") ? "&" : "?";
        finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
      }

      const existingQuery = await db!
        .collection("jobs")
        .where("originalApplicationLink", "==", dedupeUrl)
        .limit(1)
        .get();

      const existingDoc = !existingQuery.empty ? existingQuery.docs[0] : null;

      if (existingDoc) {
        if (feed.updateExistingJobs) {
          const updateData: any = {
            title,
            description: decode(description),
            updatedAt: new Date(),
            importedFrom: feed.id,
          };

          if (locationStr) updateData.location = locationStr;
          if (jobType) updateData.employmentType = normalizeJobType(jobType);
          if (category) updateData.category = category;

          await existingDoc.ref.update(updateData);
          updatedJobs.push({ id: existingDoc.id, title });
        } else {
          skipped++;
        }
        continue;
      }

      let closingDate = null;
      if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
        closingDate = expDate.toISOString();
      }

      const jobData: any = {
        employerId: feed.employerId,
        employerName: feed.employerName,
        title,
        description: decode(description),
        location: locationStr || "Location not specified",
        employmentType: normalizeJobType(jobType) || "Full-time",
        remoteFlag: false,
        applicationLink: finalApplyUrl || dedupeUrl,
        originalApplicationLink: dedupeUrl,
        closingDate,
        active: true,
        createdAt: new Date(),
        viewsCount: 0,
        applicationsCount: 0,
        importedFrom: feed.id,
        originalUrl: applyUrl || dedupeUrl,
        noIndex: feed.noIndexByGoogle || false,
      };

      if (category) jobData.category = category;
      if (salaryStr) jobData.salary = { display: salaryStr };

      const jobRef = await db!.collection("jobs").add(jobData);
      await jobRef.update({ id: jobRef.id });

      newJobs.push({ id: jobRef.id, title });
    } catch (itemError) {
      errors.push(`Error: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
    }
  }

  let expiredJobs = 0;
  if (feed.jobExpiration?.type === "feed") {
    expiredJobs = await expireOldJobs(feed.id, currentFeedUrls);
  }

  await db!.collection("rssFeeds").doc(feed.id).update({
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
}

async function processXmlFeed(feed: RSSFeedConfig, xmlText: string) {
  const mappings = feed.fieldMappings || {};

  const parsed = await parseStringPromise(xmlText, {
    explicitArray: true,
    ignoreAttrs: false,
    strict: false,
  });

  let jobs: any[] = [];
  if (parsed.source?.job) jobs = parsed.source.job;
  else if (parsed.jobs?.job) jobs = parsed.jobs.job;
  else if (parsed.rss?.channel?.[0]?.item) jobs = parsed.rss.channel[0].item;
  else if (parsed.feed?.entry) jobs = parsed.feed.entry;
  else if (parsed.JobPositionPostings?.JobPositionPosting) jobs = parsed.JobPositionPostings.JobPositionPosting;
  else {
    const findJobsArray = (obj: any, depth = 0): any[] => {
      if (depth > 5) return [];
      if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") return obj;
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
  const currentFeedUrls = new Set<string>();

  for (const job of jobs) {
    try {
      const title = getXmlFieldValue(job, mappings.title, ["title", "jobtitle", "position"]);
      const description = getXmlFieldValue(job, mappings.description, ["description", "jobdescription", "content"]);
      const applyUrl = getXmlFieldValue(job, mappings.applyUrl, ["applyurl", "applicationurl", "url", "link"]);
      const jobIdOrUrl = getXmlFieldValue(job, mappings.jobIdOrUrl, ["id", "jobid", "url"]);
      const locationString = getXmlFieldValue(job, mappings.location, ["location", "joblocation"]);
      const city = getXmlFieldValue(job, mappings.city, ["city"]);
      const state = getXmlFieldValue(job, mappings.state, ["state", "province"]);
      const country = getXmlFieldValue(job, mappings.country, ["country"]);
      const remote = getXmlFieldValue(job, mappings.remote, ["remote"]);
      const jobType = getXmlFieldValue(job, mappings.jobType, ["jobtype", "employmenttype"]);
      const category = getXmlFieldValue(job, mappings.category, ["category", "department"]);
      const expirationDate = getXmlFieldValue(job, mappings.expirationDate, ["expirationdate", "closingdate"]);
      const salaryString = getXmlFieldValue(job, mappings.salaryString, ["salary"]);

      const dedupeUrl = applyUrl || jobIdOrUrl;
      if (!dedupeUrl) continue;

      currentFeedUrls.add(dedupeUrl);

      let finalApplyUrl = applyUrl || dedupeUrl;
      if (feed.utmTrackingTag && finalApplyUrl) {
        const separator = finalApplyUrl.includes("?") ? "&" : "?";
        finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
      }

      const existing = await db!
        .collection("jobs")
        .where("originalApplicationLink", "==", dedupeUrl)
        .limit(1)
        .get();

      const existingDoc = !existing.empty ? existing.docs[0] : null;

      if (existingDoc) {
        if (feed.updateExistingJobs) {
          const updateData: any = {
            title: title || existingDoc.data().title,
            description: decode(description || ""),
            updatedAt: new Date(),
            importedFrom: feed.id,
          };

          let location = locationString || city;
          if (state) location = location ? `${location}, ${state}` : state;
          if (location) updateData.location = location;
          if (jobType) updateData.employmentType = normalizeJobType(jobType);
          if (category) updateData.category = category;

          await existingDoc.ref.update(updateData);
          updatedJobs.push({ id: existingDoc.id, title });
        } else {
          skipped++;
        }
        continue;
      }

      let location = locationString || city;
      if (state) location = location ? `${location}, ${state}` : state;
      if (country && !location) location = country;
      if (!location) location = "Location not specified";

      const remoteFlag = remote?.toLowerCase() === "yes" || remote?.toLowerCase() === "true";

      let closingDate = null;
      if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
        closingDate = expDate.toISOString();
      } else if (expirationDate) {
        try { closingDate = new Date(expirationDate).toISOString(); } catch { }
      }

      const jobData: any = {
        employerId: feed.employerId,
        employerName: feed.employerName,
        title: title || "Untitled Position",
        description: decode(description || ""),
        location,
        employmentType: normalizeJobType(jobType) || "Full-time",
        remoteFlag,
        applicationLink: finalApplyUrl,
        originalApplicationLink: dedupeUrl,
        closingDate,
        active: true,
        createdAt: new Date(),
        viewsCount: 0,
        applicationsCount: 0,
        importedFrom: feed.id,
        originalUrl: dedupeUrl,
        noIndex: feed.noIndexByGoogle || false,
      };

      if (category) jobData.category = category;
      if (salaryString) jobData.salary = { display: salaryString };

      const jobRef = await db!.collection("jobs").add(jobData);
      await jobRef.update({ id: jobRef.id });

      newJobs.push({ id: jobRef.id, title: jobData.title });
    } catch (itemError) {
      errors.push(`Error: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
    }
  }

  let expiredJobs = 0;
  if (feed.jobExpiration?.type === "feed") {
    expiredJobs = await expireOldJobs(feed.id, currentFeedUrls);
  }

  await db!.collection("rssFeeds").doc(feed.id).update({
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
}

async function expireOldJobs(feedId: string, currentFeedUrls: Set<string>): Promise<number> {
  let expiredJobs = 0;
  const existingFeedJobs = await db!
    .collection("jobs")
    .where("importedFrom", "==", feedId)
    .where("active", "==", true)
    .get();

  for (const doc of existingFeedJobs.docs) {
    const jobData = doc.data();
    const originalLink = jobData.originalApplicationLink || jobData.applicationLink;

    if (!currentFeedUrls.has(originalLink)) {
      await doc.ref.update({
        active: false,
        expiredAt: new Date(),
        expirationReason: "Removed from feed",
      });
      expiredJobs++;
    }
  }
  return expiredJobs;
}

function getMappedValue(job: ScrapedJob, mappedField: string | undefined, defaultField: string): string {
  if (mappedField && job[mappedField]) return job[mappedField] || "";
  return job[defaultField] || "";
}

function getXmlFieldValue(job: any, fieldName: string | undefined, defaultFields: string[]): string {
  if (fieldName) {
    if (fieldName.includes(".")) {
      const parts = fieldName.split(".");
      let value = job;
      for (const part of parts) {
        if (value && typeof value === "object") value = value[part];
        else break;
      }
      if (Array.isArray(value)) return value[0] || "";
      return value || "";
    }
    const value = job[fieldName];
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
  }

  for (const defaultField of defaultFields) {
    const value = job[defaultField];
    if (value) {
      if (Array.isArray(value)) return value[0] || "";
      return value || "";
    }
  }
  return "";
}

function normalizeJobType(type: string): string {
  if (!type) return "Full-time";
  const lower = type.toLowerCase().trim();
  if (lower.includes("full") || lower === "ft") return "Full-time";
  if (lower.includes("part") || lower === "pt") return "Part-time";
  if (lower.includes("contract")) return "Contract";
  if (lower.includes("temp")) return "Temporary";
  if (lower.includes("intern")) return "Internship";
  return type;
}
