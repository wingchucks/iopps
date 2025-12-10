import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { decode } from "he";

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

        const mappings = feed.fieldMappings || {};

        // Fetch XML from URL
        const response = await fetch(feed.feedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch feed: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // Parse XML
        const parsed = await parseStringPromise(xmlText, {
            explicitArray: true,
            ignoreAttrs: false,
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

                // Check if job already exists by originalApplicationLink
                const existing = await db!
                    .collection("jobs")
                    .where("originalApplicationLink", "==", dedupeUrl)
                    .limit(1)
                    .get();

                // Also check with UTM tag version
                let existingWithUtm = { empty: true, docs: [] as any[] };
                if (feed.utmTrackingTag && dedupeUrl !== finalApplyUrl) {
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
                            title: title || existingDoc.data().title,
                            description: decode(description || ""),
                            updatedAt: new Date(),
                            importedFrom: feedId,
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
                if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                    const expDate = new Date();
                    expDate.setDate(expDate.getDate() + feed.jobExpiration.daysAfterImport);
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
                    quickApplyEnabled: true, // All imported jobs use Quick Apply
                    originalApplicationLink: dedupeUrl, // Store original for reference and deduplication
                    closingDate: closingDate,
                    active: true,
                    createdAt: new Date(),
                    viewsCount: 0,
                    applicationsCount: 0,
                    // Track that this came from RSS
                    importedFrom: feedId,
                    originalUrl: dedupeUrl,
                    // SmartJobBoard features
                    noIndex: feed.noIndexByGoogle || false,
                };

                // Add optional fields if present
                if (category) jobData.category = category;
                if (salary) jobData.salary = salary;
                if (applyUrl && applyUrl !== dedupeUrl) {
                    jobData.applicationLink = finalApplyUrl;
                }

                // Create job in Firestore
                const jobRef = await db!.collection("jobs").add(jobData);
                await jobRef.update({ id: jobRef.id });

                newJobs.push({ id: jobRef.id, title: jobData.title });
            } catch (itemError) {
                const jobTitle = getFieldValue(job, mappings.title, ["title"]) || "Unknown";
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
