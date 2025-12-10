import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";
import { scrapeJobsFromHtml, isHtmlContent, isXmlContent, ScrapedJob } from "@/lib/html-job-scraper";

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
    employerId: string;
    employerName?: string;
    feedUrl: string;
    feedName: string;
    active: boolean;
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

export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await auth!.verifyIdToken(token);

        const userDoc = await db!.collection("users").doc(decodedToken.uid).get();
        const role = userDoc.data()?.role;

        if (role !== "admin" && role !== "moderator") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get feed ID from request
        const { feedId } = await request.json();

        // Fetch feed configuration
        const feedDoc = await db!.collection("rssFeeds").doc(feedId).get();
        if (!feedDoc.exists) {
            return NextResponse.json({ error: "Feed not found" }, { status: 404 });
        }

        const feed = feedDoc.data() as RSSFeedConfig;
        if (!feed) {
            return NextResponse.json({ error: "Invalid feed data" }, { status: 400 });
        }

        // Fetch content from URL
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

        // Determine feed type and process accordingly
        let result;
        if (feed.feedType === "html" || isHtmlContent(content, contentType)) {
            result = await processHtmlFeed(feed, feedId, content);
            // Update feed type if not set
            if (!feed.feedType) {
                await db!.collection("rssFeeds").doc(feedId).update({ feedType: "html" });
            }
        } else {
            result = await processXmlFeed(feed, feedId, content);
            // Update feed type if not set
            if (!feed.feedType) {
                await db!.collection("rssFeeds").doc(feedId).update({ feedType: "xml" });
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to scrape feed";
        console.error("Error scraping feed:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

/**
 * Process HTML feed by scraping
 */
async function processHtmlFeed(feed: RSSFeedConfig, feedId: string, html: string) {
    const mappings = feed.fieldMappings || {};
    const scrapeResult = scrapeJobsFromHtml(html, feed.feedUrl);

    const newJobs: any[] = [];
    const updatedJobs: any[] = [];
    const errors: string[] = [];
    let skipped = 0;

    // Track all current feed URLs for "feed" expiration type
    const currentFeedUrls = new Set<string>();

    for (const scrapedJob of scrapeResult.jobs) {
        try {
            // Get values using field mappings or scraped values
            const title = getMappedValue(scrapedJob, mappings.title, "title") || "Untitled Position";
            const description = getMappedValue(scrapedJob, mappings.description, "description") || "";
            const applyUrl = getMappedValue(scrapedJob, mappings.applyUrl, "applyUrl") ||
                getMappedValue(scrapedJob, mappings.applyUrl, "url") || "";
            const jobIdOrUrl = getMappedValue(scrapedJob, mappings.jobIdOrUrl, "jobId") ||
                getMappedValue(scrapedJob, mappings.jobIdOrUrl, "url") || applyUrl;

            // Location
            const locationStr = getMappedValue(scrapedJob, mappings.location, "location") || "";

            // Other fields
            const jobType = getMappedValue(scrapedJob, mappings.jobType, "jobType") || "";
            const category = getMappedValue(scrapedJob, mappings.category, "department") || "";
            const salaryStr = getMappedValue(scrapedJob, mappings.salaryString, "salary") || "";
            const postedDate = getMappedValue(scrapedJob, undefined, "postedDate") || "";

            // Use jobIdOrUrl for deduplication
            const dedupeUrl = applyUrl || jobIdOrUrl || title; // Use title as last resort

            if (!dedupeUrl) {
                errors.push(`Skipping job "${title}": No URL or ID for deduplication`);
                continue;
            }

            // Track this URL for feed-based expiration
            currentFeedUrls.add(dedupeUrl);

            // Apply UTM tracking
            let finalApplyUrl = applyUrl;
            if (feed.utmTrackingTag && finalApplyUrl) {
                const separator = finalApplyUrl.includes("?") ? "&" : "?";
                finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
            }

            // Check if job already exists
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
                        importedFrom: feedId,
                    };

                    if (locationStr) updateData.location = locationStr;
                    if (jobType) updateData.employmentType = normalizeJobType(jobType);
                    if (category) updateData.category = category;

                    if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
                        updateData.closingDate = expDate.toISOString();
                    }

                    await existingDoc.ref.update(updateData);
                    updatedJobs.push({ id: existingDoc.id, title });
                } else {
                    skipped++;
                }
                continue;
            }

            // Calculate closing date
            let closingDate = null;
            if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
                closingDate = expDate.toISOString();
            }

            // Build salary info
            let salary = null;
            if (salaryStr) {
                salary = { display: salaryStr };
            }

            // Create job document
            const jobData: any = {
                employerId: feed.employerId,
                employerName: feed.employerName,
                title,
                description: decode(description),
                location: locationStr || "Location not specified",
                employmentType: normalizeJobType(jobType) || "Full-time",
                remoteFlag: false,
                quickApplyEnabled: true,
                originalApplicationLink: dedupeUrl,
                closingDate,
                active: true,
                createdAt: new Date(),
                viewsCount: 0,
                applicationsCount: 0,
                importedFrom: feedId,
                originalUrl: applyUrl || dedupeUrl,
                noIndex: feed.noIndexByGoogle || false,
            };

            if (category) jobData.category = category;
            if (salary) jobData.salary = salary;
            if (finalApplyUrl) jobData.applicationLink = finalApplyUrl;

            const jobRef = await db!.collection("jobs").add(jobData);
            await jobRef.update({ id: jobRef.id });

            newJobs.push({ id: jobRef.id, title });
        } catch (itemError) {
            const itemErrorMessage = itemError instanceof Error ? itemError.message : String(itemError);
            errors.push(`Error processing job: ${itemErrorMessage}`);
        }
    }

    // Handle feed expiration
    let expiredJobs = 0;
    if (feed.jobExpiration?.type === "feed") {
        expiredJobs = await expireOldJobs(feedId, currentFeedUrls);
    }

    // Update feed stats
    await db!.collection("rssFeeds").doc(feedId).update({
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
        totalJobsInFeed: scrapeResult.jobs.length,
        errors,
        importedJobs: newJobs,
        updatedJobs,
        feedType: "html",
    };
}

/**
 * Process XML feed
 */
async function processXmlFeed(feed: RSSFeedConfig, feedId: string, xmlText: string) {
    const mappings = feed.fieldMappings || {};

    // Parse XML
    const parsed = await parseStringPromise(xmlText, {
        explicitArray: true,
        ignoreAttrs: false,
        strict: false,
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
    const currentFeedUrls = new Set<string>();

    for (const job of jobs) {
        try {
            // Extract values using field mappings with fallbacks
            const title = getXmlFieldValue(job, mappings.title, ["title", "jobtitle", "position"]);
            const description = getXmlFieldValue(job, mappings.description, ["description", "jobdescription", "content", "body"]);
            const applyUrl = getXmlFieldValue(job, mappings.applyUrl, ["applyurl", "applicationurl", "url", "link"]);
            const jobIdOrUrl = getXmlFieldValue(job, mappings.jobIdOrUrl, ["id", "jobid", "url", "applyurl"]);

            // Location fields
            const locationString = getXmlFieldValue(job, mappings.location, ["location", "joblocation"]);
            const city = getXmlFieldValue(job, mappings.city, ["city", "locality"]);
            const state = getXmlFieldValue(job, mappings.state, ["state", "province", "region"]);
            const country = getXmlFieldValue(job, mappings.country, ["country"]);
            const remote = getXmlFieldValue(job, mappings.remote, ["remote", "isremote"]);

            // Other fields
            const jobType = getXmlFieldValue(job, mappings.jobType, ["jobtype", "employmenttype", "type"]);
            const category = getXmlFieldValue(job, mappings.category, ["category", "department"]);
            const expirationDate = getXmlFieldValue(job, mappings.expirationDate, ["expirationdate", "expires", "closingdate"]);

            // Salary fields
            const salaryString = getXmlFieldValue(job, mappings.salaryString, ["salary", "compensation"]);
            const salaryFrom = getXmlFieldValue(job, mappings.salaryFrom, ["salaryfrom", "salarymin", "minsalary"]);
            const salaryTo = getXmlFieldValue(job, mappings.salaryTo, ["salaryto", "salarymax", "maxsalary"]);
            const salaryPeriod = getXmlFieldValue(job, mappings.salaryPeriod, ["salaryperiod", "payperiod"]);

            const dedupeUrl = applyUrl || jobIdOrUrl;

            if (!dedupeUrl) {
                errors.push(`Skipping job "${title || "Unknown"}": No application URL or job ID`);
                continue;
            }

            currentFeedUrls.add(dedupeUrl);

            // Apply UTM tracking
            let finalApplyUrl = applyUrl || dedupeUrl;
            if (feed.utmTrackingTag && finalApplyUrl) {
                const separator = finalApplyUrl.includes("?") ? "&" : "?";
                finalApplyUrl = `${finalApplyUrl}${separator}${feed.utmTrackingTag}`;
            }

            // Check for existing job
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
                        importedFrom: feedId,
                    };

                    let location = locationString || city;
                    if (state) location = location ? `${location}, ${state}` : state;
                    if (location) updateData.location = location;

                    if (jobType) updateData.employmentType = normalizeJobType(jobType);
                    if (category) updateData.category = category;

                    if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
                        updateData.closingDate = expDate.toISOString();
                    }

                    await existingDoc.ref.update(updateData);
                    updatedJobs.push({ id: existingDoc.id, title });
                } else {
                    skipped++;
                }
                continue;
            }

            // Build location
            let location = locationString || city;
            if (state) location = location ? `${location}, ${state}` : state;
            if (country && !location) location = country;
            if (!location) location = "Location not specified";

            // Remote flag
            const remoteFlag = remote?.toLowerCase() === "yes" || remote?.toLowerCase() === "true" || remote === "1";

            // Closing date
            let closingDate = null;
            if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
                closingDate = expDate.toISOString();
            } else if (expirationDate) {
                try {
                    closingDate = new Date(expirationDate).toISOString();
                } catch { }
            }

            // Salary
            let salary: any = null;
            if (salaryString) {
                salary = { display: salaryString };
            } else if (salaryFrom || salaryTo) {
                salary = {};
                if (salaryFrom) salary.min = parseFloat(salaryFrom) || undefined;
                if (salaryTo) salary.max = parseFloat(salaryTo) || undefined;
                if (salaryPeriod) salary.period = salaryPeriod;
            }

            // Create job
            const jobData: any = {
                employerId: feed.employerId,
                employerName: feed.employerName,
                title: title || "Untitled Position",
                description: decode(description || ""),
                location,
                employmentType: normalizeJobType(jobType) || "Full-time",
                remoteFlag,
                quickApplyEnabled: true,
                originalApplicationLink: dedupeUrl,
                closingDate,
                active: true,
                createdAt: new Date(),
                viewsCount: 0,
                applicationsCount: 0,
                importedFrom: feedId,
                originalUrl: dedupeUrl,
                noIndex: feed.noIndexByGoogle || false,
            };

            if (category) jobData.category = category;
            if (salary) jobData.salary = salary;
            if (applyUrl && applyUrl !== dedupeUrl) {
                jobData.applicationLink = finalApplyUrl;
            }

            const jobRef = await db!.collection("jobs").add(jobData);
            await jobRef.update({ id: jobRef.id });

            newJobs.push({ id: jobRef.id, title: jobData.title });
        } catch (itemError) {
            const jobTitle = getXmlFieldValue(job, mappings.title, ["title"]) || "Unknown";
            const itemErrorMessage = itemError instanceof Error ? itemError.message : String(itemError);
            errors.push(`Error processing "${jobTitle}": ${itemErrorMessage}`);
        }
    }

    // Handle feed expiration
    let expiredJobs = 0;
    if (feed.jobExpiration?.type === "feed") {
        expiredJobs = await expireOldJobs(feedId, currentFeedUrls);
    }

    // Update feed stats
    await db!.collection("rssFeeds").doc(feedId).update({
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
        totalJobsInFeed: jobs.length,
        errors,
        importedJobs: newJobs,
        updatedJobs,
        feedType: "xml",
    };
}

/**
 * Expire jobs that are no longer in the feed
 */
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

/**
 * Get mapped value from scraped job
 */
function getMappedValue(job: ScrapedJob, mappedField: string | undefined, defaultField: string): string {
    if (mappedField && job[mappedField]) {
        return job[mappedField] || "";
    }
    return job[defaultField] || "";
}

/**
 * Get value from XML job using field mapping
 */
function getXmlFieldValue(job: any, fieldName: string | undefined, defaultFields: string[]): string {
    if (fieldName) {
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

/**
 * Normalize job type strings
 */
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

    return type;
}
