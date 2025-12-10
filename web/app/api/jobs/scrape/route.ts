import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";

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
            console.log(`Trying Oracle API endpoint: ${endpoint}`);
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
                    console.log(`Successfully fetched ${jobs.length} jobs from Oracle HCM`);
                    return jobs;
                }
            } else {
                const errorText = await response.text();
                lastError = `${response.status}: ${errorText.substring(0, 200)}`;
                console.log(`Oracle API returned ${response.status} for endpoint`);
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            console.log(`Error fetching from Oracle API: ${lastError}`);
        }
    }

    // If all API attempts fail, throw with details
    throw new Error(`Oracle HCM API not accessible. The site "${siteName}" may require authentication or use a different API format. Last error: ${lastError}`);
}

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
            const desc = requisition.requisitionDescriptions.find((d: any) => d.DescriptionType === "External" || d.descriptionType === "External")
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

        // Detect feed type and parse accordingly
        const feedType = detectFeedType(feed.feedUrl);
        let jobs: NormalizedJob[] = [];

        if (feedType === "oracle_hcm") {
            // Oracle HCM Cloud - use REST API
            const apiUrl = getOracleApiUrl(feed.feedUrl);
            jobs = await parseOracleHcmJobs(apiUrl, feed.feedUrl);
        } else {
            // Standard XML/RSS feed
            const response = await fetch(feed.feedUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch feed: ${response.statusText}`);
            }
            const xmlText = await response.text();
            jobs = await parseXmlJobs(xmlText);
        }

        const newJobs: any[] = [];
        const updatedJobs: any[] = [];
        const errors: string[] = [];
        let skipped = 0;

        // Track all current feed URLs for "feed" expiration type
        const currentFeedUrls = new Set<string>();

        for (const job of jobs) {
            try {
                const applyUrl = job.applyUrl;
                const title = job.title;

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

                // Check if job already exists by originalApplicationLink
                const existing = await db!
                    .collection("jobs")
                    .where("originalApplicationLink", "==", applyUrl)
                    .limit(1)
                    .get();

                // Also check with UTM tag version
                let existingWithUtm = { empty: true, docs: [] as any[] };
                if (feed.utmTrackingTag && applyUrl !== finalApplyUrl) {
                    existingWithUtm = await db!
                        .collection("jobs")
                        .where("originalApplicationLink", "==", finalApplyUrl)
                        .limit(1)
                        .get();
                }

                const existingDoc = !existing.empty ? existing.docs[0] : (!existingWithUtm.empty ? existingWithUtm.docs[0] : null);

                if (existingDoc) {
                    if (feed.updateExistingJobs) {
                        // Update existing job
                        const updateData: any = {
                            title: title,
                            description: job.description,
                            updatedAt: new Date(),
                            importedFrom: feedId,
                        };

                        if (job.location) updateData.location = job.location;

                        // Update expiration if set
                        if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                            const expirationDate = new Date();
                            expirationDate.setDate(expirationDate.getDate() + feed.jobExpiration.daysAfterImport);
                            updateData.closingDate = expirationDate.toISOString();
                        }

                        await existingDoc.ref.update(updateData);
                        updatedJobs.push({ id: existingDoc.id, title });
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Parse expiration date - use feed config or job data
                let closingDate = null;
                if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + feed.jobExpiration.daysAfterImport);
                    closingDate = expirationDate.toISOString();
                } else if (job.expirationDate) {
                    try {
                        closingDate = new Date(job.expirationDate).toISOString();
                    } catch {
                        // Invalid date, leave as null
                    }
                }

                // Create job document
                const jobData: any = {
                    employerId: feed.employerId,
                    employerName: job.company || feed.employerName,
                    title: title,
                    description: job.description,
                    location: job.location,
                    employmentType: "Full-time",
                    remoteFlag: job.remote || false,
                    quickApplyEnabled: true,
                    originalApplicationLink: applyUrl,
                    closingDate: closingDate,
                    active: true,
                    createdAt: new Date(),
                    viewsCount: 0,
                    applicationsCount: 0,
                    importedFrom: feedId,
                    originalUrl: applyUrl,
                    noIndex: feed.noIndexByGoogle || false,
                };

                // Create job in Firestore
                const jobRef = await db!.collection("jobs").add(jobData);
                await jobRef.update({ id: jobRef.id });

                newJobs.push({ id: jobRef.id, title: jobData.title });
            } catch (itemError) {
                const jobTitle = job.title || "Unknown";
                const itemErrorMessage = itemError instanceof Error ? itemError.message : String(itemError);
                errors.push(`Error processing "${jobTitle}": ${itemErrorMessage}`);
            }
        }

        // Handle "feed" expiration type - expire jobs that are no longer in the feed
        let expiredJobs = 0;
        if (feed.jobExpiration?.type === "feed") {
            const existingFeedJobs = await db!
                .collection("jobs")
                .where("importedFrom", "==", feedId)
                .where("active", "==", true)
                .get();

            for (const doc of existingFeedJobs.docs) {
                const jobData = doc.data();
                const originalLink = jobData.originalApplicationLink || jobData.applicationLink;

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
            .doc(feedId)
            .update({
                lastSyncedAt: new Date(),
                syncErrors: errors.length > 0 ? errors : [],
                totalJobsImported: (feed.totalJobsImported || 0) + newJobs.length,
            });

        return NextResponse.json({
            success: true,
            feedType: feedType,
            jobsImported: newJobs.length,
            jobsUpdated: updatedJobs.length,
            jobsExpired: expiredJobs,
            jobsSkipped: skipped,
            totalJobsInFeed: jobs.length,
            errors: errors,
            importedJobs: newJobs,
            updatedJobs: updatedJobs,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to scrape feed";
        console.error("Error scraping feed:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
