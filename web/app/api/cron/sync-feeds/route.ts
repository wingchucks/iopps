import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";
import { scrapeJobsFromHtml, isHtmlContent, ScrapedJob } from "@/lib/html-job-scraper";
import {
  parseJobDescription,
  parseSalary,
  extractLocationFromDescription,
  cleanText,
} from "@/lib/job-description-parser";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Log cron execution to Firestore for monitoring
async function logCronExecution(
  cronType: string,
  frequency: string | null,
  status: "started" | "success" | "error",
  details: {
    feedsSynced?: number;
    feedsFailed?: number;
    totalJobsImported?: number;
    totalJobsUpdated?: number;
    totalJobsExpired?: number;
    errors?: string[];
    durationMs?: number;
    errorMessage?: string;
  } = {}
) {
  if (!db) return;

  try {
    await db.collection("cronLogs").add({
      cronType,
      frequency,
      status,
      ...details,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Don't let logging failures break the cron
    console.error("Failed to log cron execution:", err);
  }
}

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
  logoUrl?: string;
  requirements?: string;
  benefits?: string;
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
  keywordFilter?: {
    enabled: boolean;
    keywords: string[];
    matchIn: ("title" | "description")[];
  };
}

// Indigenous keywords for filtering
const INDIGENOUS_KEYWORDS = [
  "indigenous",
  "first nation",
  "first nations",
  "métis",
  "metis",
  "inuit",
  "aboriginal",
  "native",
  "fnmi",
  "reconciliation",
];

function matchesKeywordFilter(
  title: string,
  description: string,
  filter?: RSSFeedConfig["keywordFilter"]
): boolean {
  if (!filter?.enabled) return true;

  const keywords = filter.keywords.length > 0 ? filter.keywords : INDIGENOUS_KEYWORDS;
  const searchIn = filter.matchIn.length > 0 ? filter.matchIn : ["title", "description"];

  const textToSearch: string[] = [];
  if (searchIn.includes("title")) textToSearch.push(title.toLowerCase());
  if (searchIn.includes("description")) textToSearch.push(description.toLowerCase());

  const combinedText = textToSearch.join(" ");

  return keywords.some(keyword => combinedText.includes(keyword.toLowerCase()));
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

  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get("frequency") as "hourly" | "daily" | "weekly" | null;

  try {
    // Log cron start
    await logCronExecution("sync-feeds", frequency, "started");

    let query = db.collection("rssFeeds").where("active", "==", true);

    if (frequency) {
      query = query.where("syncFrequency", "==", frequency);
    }

    const feedsSnapshot = await query.get();

    if (feedsSnapshot.empty) {
      await logCronExecution("sync-feeds", frequency, "success", {
        feedsSynced: 0,
        durationMs: Date.now() - startTime,
      });
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

    // Log successful completion
    await logCronExecution("sync-feeds", frequency, "success", {
      ...results,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, ...results, timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error
    await logCronExecution("sync-feeds", frequency, "error", {
      errorMessage,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Failed to process feed sync", details: errorMessage },
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

  // Check if keyword filtering is enabled for this feed
  const keywordFilterEnabled = feed.keywordFilter?.enabled;

  for (const scrapedJob of scrapeResult.jobs) {
    try {
      const title = getMappedValue(scrapedJob, mappings.title, "title") || "Untitled Position";
      const rawDescription = getMappedValue(scrapedJob, mappings.description, "description") || "";
      const applyUrl = getMappedValue(scrapedJob, mappings.applyUrl, "applyUrl") ||
        getMappedValue(scrapedJob, mappings.applyUrl, "url") || "";
      const jobIdOrUrl = getMappedValue(scrapedJob, mappings.jobIdOrUrl, "jobId") ||
        getMappedValue(scrapedJob, mappings.jobIdOrUrl, "url") || applyUrl;
      let locationStr = getMappedValue(scrapedJob, mappings.location, "location") || "";
      const jobType = getMappedValue(scrapedJob, mappings.jobType, "jobType") || "";
      const category = getMappedValue(scrapedJob, mappings.category, "department") || "";
      const salaryStr = getMappedValue(scrapedJob, mappings.salaryString, "salary") || "";
      const logoUrl = getMappedValue(scrapedJob, mappings.logoUrl, "logo") || "";

      // Decode and parse description for structured fields
      const decodedDescription = decode(rawDescription);
      const parsedDescription = parseJobDescription(decodedDescription);
      const plainTextDescription = parsedDescription.plainDescription;

      // Check if job passes keyword filter - if it does, mark as indigenous preference
      const passedKeywordFilter = matchesKeywordFilter(title, plainTextDescription, feed.keywordFilter);

      // If keyword filter is enabled and job doesn't pass, skip it
      if (keywordFilterEnabled && !passedKeywordFilter) {
        skipped++;
        continue;
      }

      // Jobs that pass the indigenous keyword filter get the preference flag
      const indigenousPreference = keywordFilterEnabled && passedKeywordFilter;

      const dedupeUrl = applyUrl || jobIdOrUrl || title;

      if (!dedupeUrl) continue;

      currentFeedUrls.add(dedupeUrl);

      let finalApplyUrl = applyUrl;
      if (feed.utmTrackingTag && finalApplyUrl) {
        const separator = finalApplyUrl.includes("?") ? "&" : "?";
        finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
      }

      // Try to extract location from description if not provided
      if (!locationStr) {
        locationStr = extractLocationFromDescription(plainTextDescription) || "";
      }

      // Determine final location with better fallback
      const finalLocation = locationStr || "Canada"; // Better than "Location not specified"

      // Parse salary into structured format
      const parsedSalary = parseSalary(salaryStr);

      // Check for remote work indicators
      const remoteFlag =
        locationStr.toLowerCase().includes("remote") ||
        plainTextDescription.toLowerCase().includes("work from home") ||
        plainTextDescription.toLowerCase().includes("remote position") ||
        plainTextDescription.toLowerCase().includes("fully remote");

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
            description: parsedDescription.description,
            updatedAt: new Date(),
            importedFrom: feed.id,
          };

          if (finalLocation) updateData.location = finalLocation;
          if (jobType) updateData.employmentType = normalizeJobType(jobType);
          if (category) updateData.category = category;
          if (parsedDescription.requirements) updateData.requirements = parsedDescription.requirements;
          if (parsedDescription.benefits) updateData.benefits = parsedDescription.benefits;
          if (parsedDescription.qualifications) updateData.qualifications = parsedDescription.qualifications;
          if (parsedDescription.responsibilities) updateData.responsibilities = parsedDescription.responsibilities;
          if (indigenousPreference) updateData.indigenousPreference = true;
          if (parsedSalary) {
            updateData.salary = { display: parsedSalary.display };
            updateData.salaryRange = {
              min: parsedSalary.min,
              max: parsedSalary.max,
              currency: parsedSalary.currency || "CAD",
              disclosed: true,
            };
          }

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
        description: parsedDescription.description,
        location: finalLocation,
        employmentType: normalizeJobType(jobType) || "Full-time",
        remoteFlag,
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
        source: "rss-import",
      };

      // Add structured fields if extracted
      if (parsedDescription.requirements) jobData.requirements = parsedDescription.requirements;
      if (parsedDescription.benefits) jobData.benefits = parsedDescription.benefits;
      if (parsedDescription.qualifications) jobData.qualifications = parsedDescription.qualifications;
      if (parsedDescription.responsibilities) jobData.responsibilities = parsedDescription.responsibilities;

      // Add indigenous preference flag
      if (indigenousPreference) jobData.indigenousPreference = true;

      // Add category if available
      if (category) jobData.category = category;

      // Add logo URL if available
      if (logoUrl) jobData.companyLogoUrl = logoUrl;

      // Add salary in both old and new format for compatibility
      if (parsedSalary) {
        jobData.salary = { display: parsedSalary.display };
        jobData.salaryRange = {
          min: parsedSalary.min,
          max: parsedSalary.max,
          currency: parsedSalary.currency || "CAD",
          disclosed: true,
        };
      }

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

  // Check if keyword filtering is enabled for this feed
  const keywordFilterEnabled = feed.keywordFilter?.enabled;

  for (const job of jobs) {
    try {
      const title = getXmlFieldValue(job, mappings.title, ["title", "jobtitle", "position"]);
      const rawDescription = getXmlFieldValue(job, mappings.description, ["description", "jobdescription", "content"]);
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
      const logoUrl = getXmlFieldValue(job, mappings.logoUrl, ["logo", "logourl", "companylogo", "image"]);
      const xmlRequirements = getXmlFieldValue(job, mappings.requirements, ["requirements", "qualifications"]);
      const xmlBenefits = getXmlFieldValue(job, mappings.benefits, ["benefits", "perks"]);

      // Decode and parse description for structured fields
      const decodedDescription = decode(rawDescription || "");
      const parsedDescription = parseJobDescription(decodedDescription);
      const plainTextDescription = parsedDescription.plainDescription;

      // Check if job passes keyword filter - if it does, mark as indigenous preference
      const passedKeywordFilter = matchesKeywordFilter(title, plainTextDescription, feed.keywordFilter);

      // If keyword filter is enabled and job doesn't pass, skip it
      if (keywordFilterEnabled && !passedKeywordFilter) {
        skipped++;
        continue;
      }

      // Jobs that pass the indigenous keyword filter get the preference flag
      const indigenousPreference = keywordFilterEnabled && passedKeywordFilter;

      const dedupeUrl = applyUrl || jobIdOrUrl;
      if (!dedupeUrl) continue;

      currentFeedUrls.add(dedupeUrl);

      let finalApplyUrl = applyUrl || dedupeUrl;
      if (feed.utmTrackingTag && finalApplyUrl) {
        const separator = finalApplyUrl.includes("?") ? "&" : "?";
        finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
      }

      // Build location from available fields
      let location = locationString || city;
      if (state) location = location ? `${location}, ${state}` : state;
      if (country && !location) location = country;

      // Try to extract location from description if not found
      if (!location) {
        location = extractLocationFromDescription(plainTextDescription) || "";
      }

      // Better fallback than "Location not specified"
      if (!location) location = "Canada";

      // Parse salary into structured format
      const parsedSalary = parseSalary(salaryString);

      // Determine remote flag from multiple sources
      const remoteFlag =
        remote?.toLowerCase() === "yes" ||
        remote?.toLowerCase() === "true" ||
        location.toLowerCase().includes("remote") ||
        plainTextDescription.toLowerCase().includes("work from home") ||
        plainTextDescription.toLowerCase().includes("remote position") ||
        plainTextDescription.toLowerCase().includes("fully remote");

      // Use XML-provided requirements/benefits if available, otherwise use parsed ones
      const finalRequirements = xmlRequirements ? decode(xmlRequirements) : parsedDescription.requirements;
      const finalBenefits = xmlBenefits ? decode(xmlBenefits) : parsedDescription.benefits;

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
            description: parsedDescription.description,
            updatedAt: new Date(),
            importedFrom: feed.id,
          };

          if (location) updateData.location = location;
          if (jobType) updateData.employmentType = normalizeJobType(jobType);
          if (category) updateData.category = category;
          if (finalRequirements) updateData.requirements = finalRequirements;
          if (finalBenefits) updateData.benefits = finalBenefits;
          if (parsedDescription.qualifications) updateData.qualifications = parsedDescription.qualifications;
          if (parsedDescription.responsibilities) updateData.responsibilities = parsedDescription.responsibilities;
          if (indigenousPreference) updateData.indigenousPreference = true;
          if (remoteFlag) updateData.remoteFlag = true;
          if (logoUrl) updateData.companyLogoUrl = logoUrl;
          if (parsedSalary) {
            updateData.salary = { display: parsedSalary.display };
            updateData.salaryRange = {
              min: parsedSalary.min,
              max: parsedSalary.max,
              currency: parsedSalary.currency || "CAD",
              disclosed: true,
            };
          }

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
      } else if (expirationDate) {
        try { closingDate = new Date(expirationDate).toISOString(); } catch { }
      }

      const jobData: any = {
        employerId: feed.employerId,
        employerName: feed.employerName,
        title: title || "Untitled Position",
        description: parsedDescription.description,
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
        source: "rss-import",
      };

      // Add structured fields if available
      if (finalRequirements) jobData.requirements = finalRequirements;
      if (finalBenefits) jobData.benefits = finalBenefits;
      if (parsedDescription.qualifications) jobData.qualifications = parsedDescription.qualifications;
      if (parsedDescription.responsibilities) jobData.responsibilities = parsedDescription.responsibilities;

      // Add indigenous preference flag
      if (indigenousPreference) jobData.indigenousPreference = true;

      // Add category if available
      if (category) jobData.category = category;

      // Add logo URL if available
      if (logoUrl) jobData.companyLogoUrl = logoUrl;

      // Add salary in both old and new format for compatibility
      if (parsedSalary) {
        jobData.salary = { display: parsedSalary.display };
        jobData.salaryRange = {
          min: parsedSalary.min,
          max: parsedSalary.max,
          currency: parsedSalary.currency || "CAD",
          disclosed: true,
        };
      }

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
