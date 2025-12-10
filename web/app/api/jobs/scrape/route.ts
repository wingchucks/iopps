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

        // Fetch XML from URL
        const response = await fetch(feed.feedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch feed: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // Pre-process XML to fix common issues with unescaped ampersands in URLs
        // This regex finds & that are not followed by amp;, lt;, gt;, quot;, apos;, or #
        const fixedXml = xmlText.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

        // Parse XML with lenient options
        const parsed = await parseStringPromise(fixedXml, {
            strict: false,
            explicitArray: true,
            normalize: true,
            normalizeTags: true,
        });
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
                            description: decode(job.description?.[0] || ""),
                            updatedAt: new Date(),
                            importedFrom: feedId,
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
                if (feed.jobExpiration?.type === "days" && feed.jobExpiration.daysAfterImport) {
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + feed.jobExpiration.daysAfterImport);
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
                    quickApplyEnabled: true, // All imported jobs use Quick Apply
                    originalApplicationLink: applyUrl, // Store original for reference and deduplication
                    closingDate: closingDate,
                    active: true,
                    createdAt: new Date(),
                    viewsCount: 0,
                    applicationsCount: 0,
                    // Track that this came from RSS
                    importedFrom: feedId,
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
