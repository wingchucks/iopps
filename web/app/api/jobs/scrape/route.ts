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

        const feed = feedDoc.data();
        if (!feed) {
            return NextResponse.json({ error: "Invalid feed data" }, { status: 400 });
        }

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
        const errors: string[] = [];
        let skipped = 0;

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

                // Check if job already exists by applyurl
                const existing = await db!
                    .collection("jobs")
                    .where("applicationLink", "==", applyUrl)
                    .limit(1)
                    .get();

                if (!existing.empty) {
                    skipped++;
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

                // Parse expiration date
                let closingDate = null;
                if (job.expirationdate?.[0]) {
                    try {
                        closingDate = new Date(job.expirationdate[0]).toISOString();
                    } catch {
                        // Invalid date, leave as null
                    }
                }

                // Create job document
                const jobData = {
                    employerId: feed.employerId,
                    employerName: job.company?.[0] || feed.employerName,
                    title: title,
                    description: description,
                    location: location,
                    employmentType: "Full-time", // Default, could be enhanced
                    remoteFlag: remoteFlag,
                    applicationLink: applyUrl,
                    closingDate: closingDate,
                    active: true,
                    createdAt: new Date(),
                    viewsCount: 0,
                    applicationsCount: 0,
                    // Track that this came from RSS
                    importedFrom: feedId,
                    originalUrl: job.url?.[0] || applyUrl,
                };

                // Create job in Firestore
                const jobRef = await db!.collection("jobs").add(jobData);
                await jobRef.update({ id: jobRef.id });

                newJobs.push({ id: jobRef.id, title: jobData.title });
            } catch (itemError: any) {
                const jobTitle = jobXML.title?.[0] || "Unknown";
                errors.push(`Error processing "${jobTitle}": ${itemError.message}`);
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
            jobsSkipped: skipped,
            totalJobsInFeed: jobs.length,
            errors: errors,
            importedJobs: newJobs,
        });
    } catch (error: any) {
        console.error("Error scraping feed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to scrape feed" },
            { status: 500 }
        );
    }
}
