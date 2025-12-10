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

        // Fetch content from URL
        const response = await fetch(feedUrl, {
            headers: {
                "Accept": "application/xml, application/rss+xml, text/xml, application/atom+xml, */*",
                "User-Agent": "IOPPS-Feed-Parser/1.0",
            },
        });

        if (!response.ok) {
            return NextResponse.json({
                error: `Failed to fetch feed: ${response.status} ${response.statusText}`,
                hint: "Make sure the URL is accessible and returns XML content.",
            }, { status: 400 });
        }

        const contentType = response.headers.get("content-type") || "";
        const xmlText = await response.text();

        // Check if response is HTML instead of XML
        const trimmedContent = xmlText.trim().toLowerCase();
        if (trimmedContent.startsWith("<!doctype html") ||
            trimmedContent.startsWith("<html") ||
            (contentType.includes("text/html") && !trimmedContent.startsWith("<?xml"))) {
            return NextResponse.json({
                error: "The URL returns an HTML page, not an XML feed.",
                hint: "This looks like a web page URL. Please provide the direct XML/RSS feed URL. Look for a feed URL that ends in .xml or contains /feed/ or /rss/ in the path.",
            }, { status: 400 });
        }

        // Check if content looks like XML
        if (!trimmedContent.startsWith("<?xml") && !trimmedContent.startsWith("<")) {
            return NextResponse.json({
                error: "The URL does not return valid XML content.",
                hint: "The response doesn't appear to be XML. Please verify this is a valid RSS/XML feed URL.",
            }, { status: 400 });
        }

        // Parse XML with lenient options
        let parsed;
        try {
            parsed = await parseStringPromise(xmlText, {
                explicitArray: true,
                ignoreAttrs: false,
                strict: false, // More lenient parsing
                normalize: true,
                normalizeTags: false,
                trim: true,
            });
        } catch (parseError) {
            const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);

            // Provide helpful error message based on the parse error
            let hint = "The XML content has syntax errors.";
            if (parseErrorMsg.includes("Invalid character")) {
                hint = "The XML contains invalid characters. This might be an encoding issue or the feed contains special characters that aren't properly escaped.";
            } else if (parseErrorMsg.includes("entity")) {
                hint = "The XML contains undefined entities (like &nbsp; or other HTML entities). The feed may not be valid XML.";
            }

            return NextResponse.json({
                error: `XML parsing error: ${parseErrorMsg}`,
                hint,
                preview: xmlText.substring(0, 500) + "...",
            }, { status: 400 });
        }

        // Find the job items in the feed
        // Common structures: source.job, jobs.job, rss.channel.item, feed.entry
        let jobs: any[] = [];
        let feedStructure = "unknown";

        if (parsed.source?.job) {
            jobs = parsed.source.job;
            feedStructure = "source.job (Standard Job Feed)";
        } else if (parsed.jobs?.job) {
            jobs = parsed.jobs.job;
            feedStructure = "jobs.job";
        } else if (parsed.rss?.channel?.[0]?.item) {
            jobs = parsed.rss.channel[0].item;
            feedStructure = "rss.channel.item (RSS 2.0)";
        } else if (parsed.feed?.entry) {
            jobs = parsed.feed.entry;
            feedStructure = "feed.entry (Atom)";
        } else if (parsed.JobPositionPostings?.JobPositionPosting) {
            jobs = parsed.JobPositionPostings.JobPositionPosting;
            feedStructure = "JobPositionPostings.JobPositionPosting (HR-XML)";
        }

        if (jobs.length === 0) {
            // Try to find any array of items
            const findJobsArray = (obj: any, path: string, depth = 0): { jobs: any[], path: string } => {
                if (depth > 5) return { jobs: [], path: "" };
                if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
                    return { jobs: obj, path };
                }
                if (typeof obj === "object" && obj !== null) {
                    for (const key of Object.keys(obj)) {
                        const newPath = path ? `${path}.${key}` : key;
                        const result = findJobsArray(obj[key], newPath, depth + 1);
                        if (result.jobs.length > 0) return result;
                    }
                }
                return { jobs: [], path: "" };
            };
            const found = findJobsArray(parsed, "");
            jobs = found.jobs;
            if (found.path) {
                feedStructure = found.path + " (auto-detected)";
            }
        }

        if (jobs.length === 0) {
            // Show what we found in the XML for debugging
            const topLevelKeys = Object.keys(parsed);
            return NextResponse.json({
                error: "No job items found in the feed.",
                hint: `The XML was parsed but no job array was found. Top-level elements: ${topLevelKeys.join(", ")}. This feed may have an unusual structure.`,
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

        // Get a sample job for preview (simplify for display)
        const sampleJob = simplifyJobForPreview(jobs[0]);

        // Convert Set to sorted array
        const fields = Array.from(fieldSet).sort();

        return NextResponse.json({
            success: true,
            fields,
            sampleJob,
            totalJobs: jobs.length,
            feedStructure,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to detect fields";
        console.error("Error detecting fields:", error);
        return NextResponse.json(
            {
                error: message,
                hint: "An unexpected error occurred. Check the browser console for more details.",
            },
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
            extractFields(value, prefix ? `${prefix}.${key}` : key, fieldSet);
        } else {
            fieldSet.add(key);
        }
    }
}

// Simplify job object for preview (get first value from arrays, limit length)
function simplifyJobForPreview(job: any): any {
    if (!job || typeof job !== "object") return job;

    const simplified: any = {};
    for (const key of Object.keys(job)) {
        if (key === "$") continue; // Skip XML attributes

        const value = job[key];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                const first = value[0];
                if (typeof first === "string") {
                    // Truncate long strings
                    simplified[key] = first.length > 200 ? first.substring(0, 200) + "..." : first;
                } else if (typeof first === "object") {
                    simplified[key] = simplifyJobForPreview(first);
                } else {
                    simplified[key] = first;
                }
            }
        } else if (typeof value === "string") {
            simplified[key] = value.length > 200 ? value.substring(0, 200) + "..." : value;
        } else {
            simplified[key] = value;
        }
    }
    return simplified;
}
