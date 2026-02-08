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

interface NormalizedJob {
    title: string;
    description: string;
    location: string;
    applyUrl: string;
    company?: string;
    remote?: boolean;
    expirationDate?: string;
}

interface JobXML {
    title?: string[];
    description?: string[];
    applyurl?: string[];
    url?: string[];
    city?: string[];
    state?: string[];
    company?: string[];
    remote?: string[];
    expirationdate?: string[];
    [key: string]: string[] | undefined;
}

// Detect feed type from URL
function detectFeedType(url: string): "oracle_hcm" | "xml" | "json" {
    if (url.includes(".oraclecloud.com") || url.includes("/hcmUI/CandidateExperience")) {
        return "oracle_hcm";
    }
    if (url.endsWith(".json") || url.includes("format=json")) {
        return "json";
    }
    return "xml";
}

// Convert Oracle HCM career site URL to API URL
function getOracleApiUrl(careerSiteUrl: string): string {
    const url = new URL(careerSiteUrl);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Extract site name from URL (e.g., "SIGA" from /sites/SIGA)
    const siteMatch = careerSiteUrl.match(/\/sites\/([^\/\?]+)/i);
    const siteName = siteMatch ? siteMatch[1] : "CX_1";

    // Oracle HCM REST API endpoint for job requisitions
    return `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations,requisitionList.workLocation,requisitionList.requisitionDescriptions&finder=findReqs;siteNumber=${siteName},facetsList=LOCATIONS;WORK_LOCATIONS;WORKPLACE_TYPES;TITLES;CATEGORIES;ORGANIZATIONS;POSTING_DATES;FLEX_FIELDS&limit=500`;
}

// Parse Oracle HCM API response
async function parseOracleHcmJobs(apiUrl: string, careerSiteUrl: string): Promise<NormalizedJob[]> {
    const url = new URL(careerSiteUrl);
    const baseUrl = `${url.protocol}//${url.host}`;
    const siteMatch = careerSiteUrl.match(/\/sites\/([^\/\?]+)/i);
    const siteName = siteMatch ? siteMatch[1] : "CX_1";

    // Try multiple Oracle API endpoint formats
    const apiEndpoints = [
        // Format 1: Standard recruiting API with site number
        `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations,requisitionList.workLocation,requisitionList.requisitionDescriptions&finder=findReqs;siteNumber=${siteName}&limit=500`,
        // Format 2: Simpler query
        `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&finder=findReqs;siteNumber=${siteName}&limit=500`,
        // Format 3: Using site name as-is (some Oracle setups use different patterns)
        `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&finder=findReqs;SiteNumber=${siteName}&limit=500`,
        // Format 4: Try with CX_ prefix
        `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&finder=findReqs;siteNumber=CX_${siteName}&limit=500`,
    ];

    let lastError = "";
    for (const endpoint of apiEndpoints) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const jobs = normalizeOracleJobs(data, careerSiteUrl);
                if (jobs.length > 0) {
                    return jobs;
                }
            } else {
                const errorText = await response.text();
                lastError = `${response.status}: ${errorText.substring(0, 200)}`;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }
    }

    // If all API attempts fail, throw with details
    throw new Error(`Oracle HCM API not accessible. The site "${siteName}" may require authentication or use a different API format. Last error: ${lastError}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOracleJobs(data: any, careerSiteUrl: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];
    const items = data.items || data.requisitionList || [];

    for (const item of items) {
        const requisition = item.requisitionList?.[0] || item;

        // Build location string
        let location = "";
        if (requisition.PrimaryLocation) {
            location = requisition.PrimaryLocation;
        } else if (requisition.primaryLocation) {
            location = requisition.primaryLocation;
        } else if (requisition.City && requisition.State) {
            location = `${requisition.City}, ${requisition.State}`;
        } else if (requisition.workLocation) {
            location = requisition.workLocation.Name || requisition.workLocation.name || "";
        }

        // Get description from requisitionDescriptions if available
        let description = "";
        if (requisition.requisitionDescriptions && requisition.requisitionDescriptions.length > 0) {
            const desc = requisition.requisitionDescriptions.find((d: Record<string, string>) => d.DescriptionType === "External" || d.descriptionType === "External")
                || requisition.requisitionDescriptions[0];
            description = desc?.Content || desc?.content || desc?.ShortDescription || desc?.shortDescription || "";
        }
        description = description || requisition.ExternalDescription || requisition.externalDescription || requisition.ShortDescriptionStr || "";

        // Build apply URL
        const reqId = requisition.Id || requisition.id || requisition.RequisitionId || requisition.requisitionId;
        const reqNumber = requisition.RequisitionNumber || requisition.requisitionNumber || reqId;

        // Extract base URL and site from career site URL
        const url = new URL(careerSiteUrl);
        const baseUrl = `${url.protocol}//${url.host}`;
        const siteMatch = careerSiteUrl.match(/\/sites\/([^\/\?]+)/i);
        const siteName = siteMatch ? siteMatch[1] : "";

        const applyUrl = `${baseUrl}/hcmUI/CandidateExperience/en/sites/${siteName}/job/${reqId}`;

        // Check for remote work
        const workplaceType = requisition.WorkplaceType || requisition.workplaceType || "";
        const isRemote = workplaceType.toLowerCase().includes("remote");

        jobs.push({
            title: requisition.Title || requisition.title || requisition.RequisitionTitle || "Untitled Position",
            description: decode(description),
            location: location || "Location not specified",
            applyUrl: applyUrl,
            company: requisition.Organization || requisition.organization || requisition.BusinessUnit || undefined,
            remote: isRemote,
            expirationDate: requisition.ExternalEndDate || requisition.externalEndDate || undefined,
        });
    }

    return jobs;
}

// Parse standard XML job feed
async function parseXmlJobs(xmlText: string): Promise<NormalizedJob[]> {
    // Pre-process XML to fix common issues with unescaped ampersands in URLs
    const fixedXml = xmlText.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

    // Parse XML with lenient options
    const parsed = await parseStringPromise(fixedXml, {
        strict: false,
        explicitArray: true,
        normalize: true,
        normalizeTags: true,
    });

    const jobs: NormalizedJob[] = [];
    const xmlJobs = parsed.source?.job || parsed.jobs?.job || parsed.rss?.channel?.[0]?.item || [];

    for (const jobXML of xmlJobs) {
        const job = jobXML as JobXML;

        const applyUrl = job.applyurl?.[0] || job.url?.[0] || "";
        const title = job.title?.[0] || "";

        if (!applyUrl || !title) continue;

        // Build location string
        const city = job.city?.[0] || "";
        const state = job.state?.[0] || "";
        let location = city;
        if (state) {
            location = location ? `${location}, ${state}` : state;
        }

        jobs.push({
            title: title,
            description: decode(job.description?.[0] || ""),
            location: location || "Remote",
            applyUrl: applyUrl,
            company: job.company?.[0],
            remote: job.remote?.[0]?.toLowerCase() === "yes",
            expirationDate: job.expirationdate?.[0],
        });
    }

    return jobs;
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

        // Detect feed type and process accordingly
        const feedType = detectFeedType(feed.feedUrl);
        let result;

        if (feedType === "oracle_hcm") {
            // Oracle HCM Cloud - use REST API
            const apiUrl = getOracleApiUrl(feed.feedUrl);
            const jobs = await parseOracleHcmJobs(apiUrl, feed.feedUrl);
            result = await processOracleJobs(feed, feedId, jobs);
        } else {
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

            // Apply keyword filter
            if (!matchesKeywordFilter(title, description, feed.keywordFilter)) {
                skipped++;
                continue;
            }

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
 * Process Oracle HCM jobs
 */
async function processOracleJobs(feed: RSSFeedConfig, feedId: string, jobs: NormalizedJob[]) {
    const newJobs: any[] = [];
    const updatedJobs: any[] = [];
    const errors: string[] = [];
    let skipped = 0;
    const currentFeedUrls = new Set<string>();

    for (const job of jobs) {
        try {
            const applyUrl = job.applyUrl;
            const title = job.title;

            if (!applyUrl) {
                errors.push(`Skipping job "${title}": No application URL`);
                continue;
            }

            currentFeedUrls.add(applyUrl);

            // Apply UTM tracking
            let finalApplyUrl = applyUrl;
            if (feed.utmTrackingTag) {
                const separator = applyUrl.includes("?") ? "&" : "?";
                finalApplyUrl = `${applyUrl}${separator}${feed.utmTrackingTag}`;
            }

            // Check if job already exists
            const existing = await db!
                .collection("jobs")
                .where("originalApplicationLink", "==", applyUrl)
                .limit(1)
                .get();

            const existingDoc = !existing.empty ? existing.docs[0] : null;

            if (existingDoc) {
                if (feed.updateExistingJobs) {
                    const updateData: any = {
                        title: title,
                        description: job.description,
                        updatedAt: new Date(),
                        importedFrom: feedId,
                    };

                    if (job.location) updateData.location = job.location;

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
            } else if (job.expirationDate) {
                try {
                    closingDate = new Date(job.expirationDate).toISOString();
                } catch { }
            }

            // Create job
            const jobData: any = {
                employerId: feed.employerId,
                employerName: job.company || feed.employerName,
                title: title,
                description: job.description,
                location: job.location || "Location not specified",
                employmentType: "Full-time",
                remoteFlag: job.remote || false,
                quickApplyEnabled: true,
                originalApplicationLink: applyUrl,
                closingDate,
                active: true,
                createdAt: new Date(),
                viewsCount: 0,
                applicationsCount: 0,
                importedFrom: feedId,
                originalUrl: applyUrl,
                noIndex: feed.noIndexByGoogle || false,
            };

            if (finalApplyUrl !== applyUrl) {
                jobData.applicationLink = finalApplyUrl;
            }

            const jobRef = await db!.collection("jobs").add(jobData);
            await jobRef.update({ id: jobRef.id });

            newJobs.push({ id: jobRef.id, title });
        } catch (itemError) {
            const jobTitle = job.title || "Unknown";
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
        feedType: "oracle_hcm",
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

            // Apply keyword filter
            if (!matchesKeywordFilter(title || "", description || "", feed.keywordFilter)) {
                skipped++;
                continue;
            }

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXmlFieldValue(job: Record<string, any>, fieldName: string | undefined, defaultFields: string[]): string {
    if (fieldName) {
        if (fieldName.includes(".")) {
            const parts = fieldName.split(".");
            let value: unknown = job;
            for (const part of parts) {
                if (value && typeof value === "object") {
                    value = (value as Record<string, unknown>)[part];
                } else {
                    break;
                }
            }
            if (Array.isArray(value)) return (value[0] as string) || "";
            return (value as string) || "";
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
