import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";

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

        const { feedUrl } = await request.json();

        if (!feedUrl) {
            return NextResponse.json({ error: "Feed URL is required" }, { status: 400 });
        }

        // Fetch XML from URL
        const response = await fetch(feedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch feed: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // Parse XML
        const parsed = await parseStringPromise(xmlText, {
            explicitArray: true,
            ignoreAttrs: false,
        });

        // Find the job items in the feed
        // Common structures: source.job, jobs.job, rss.channel.item, feed.entry
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
        }

        if (jobs.length === 0) {
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

        if (jobs.length === 0) {
            return NextResponse.json({
                error: "No job items found in the feed. Please check the feed URL or format.",
                fields: [],
                sampleJob: null,
            }, { status: 400 });
        }

        // Extract all unique field names from the first few jobs
        const fieldSet = new Set<string>();
        const sampleCount = Math.min(jobs.length, 5);

        for (let i = 0; i < sampleCount; i++) {
            const job = jobs[i];
            extractFields(job, "", fieldSet);
        }

        // Get a sample job for preview
        const sampleJob = jobs[0];

        // Convert Set to sorted array
        const fields = Array.from(fieldSet).sort();

        return NextResponse.json({
            success: true,
            fields,
            sampleJob,
            totalJobs: jobs.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to detect fields";
        console.error("Error detecting fields:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

function extractFields(obj: any, prefix: string, fieldSet: Set<string>): void {
    if (typeof obj !== "object" || obj === null) return;

    for (const key of Object.keys(obj)) {
        // Skip attributes marker from xml2js
        if (key === "$") continue;

        const value = obj[key];
        const fieldName = prefix ? `${prefix}.${key}` : key;

        // If it's an array with primitive value(s), add the field name
        if (Array.isArray(value)) {
            if (value.length > 0) {
                const firstElement = value[0];
                if (typeof firstElement === "string" || typeof firstElement === "number" || typeof firstElement === "boolean") {
                    fieldSet.add(key);
                } else if (typeof firstElement === "object") {
                    // Nested object - extract nested fields too
                    fieldSet.add(key);
                    extractFields(firstElement, key, fieldSet);
                }
            }
        } else if (typeof value === "object") {
            extractFields(value, fieldName, fieldSet);
        } else {
            fieldSet.add(key);
        }
    }
}
