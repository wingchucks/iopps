/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { parseStringPromise } from "xml2js";
import { scrapeJobsFromHtml, isHtmlContent, isXmlContent } from "@/lib/html-job-scraper";
import { validateRequired, validateUrl, validationError } from "@/lib/api-validation";

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

        const body = await request.json();
        const { feedUrl } = body;

        // Validate required field
        const requiredErr = validateRequired(body, ["feedUrl"]);
        if (requiredErr) return requiredErr;

        // Validate URL format
        const urlErr = validateUrl(feedUrl, "feedUrl");
        if (urlErr) return validationError(urlErr);

        // Fetch content from URL
        const response = await fetch(feedUrl, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        if (!response.ok) {
            return NextResponse.json({
                error: `Failed to fetch feed: ${response.status} ${response.statusText}`,
                hint: "Make sure the URL is accessible.",
            }, { status: 400 });
        }

        const contentType = response.headers.get("content-type") || "";
        const content = await response.text();
        const trimmedContent = content.trim();

        // Determine content type and process accordingly
        if (isXmlContent(trimmedContent, contentType)) {
            // Handle as XML feed
            return await processXmlFeed(content, feedUrl);
        } else if (isHtmlContent(trimmedContent, contentType)) {
            // Handle as HTML page - scrape jobs
            return processHtmlPage(content, feedUrl);
        } else {
            return NextResponse.json({
                error: "Unknown content type",
                hint: "The URL doesn't return recognizable XML or HTML content.",
            }, { status: 400 });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to detect fields";
        console.error("Error detecting fields:", error);
        return NextResponse.json(
            {
                error: message,
                hint: "An unexpected error occurred. Check the server logs for details.",
            },
            { status: 500 }
        );
    }
}

/**
 * Process HTML page and extract jobs
 */
function processHtmlPage(html: string, feedUrl: string) {
    try {
        const result = scrapeJobsFromHtml(html, feedUrl);

        if (result.jobs.length === 0) {
            // Check if this is a JavaScript-rendered SPA
            let hint = "The HTML page was loaded but no job listings were detected.";

            if (result.isSpa && result.spaPlatform) {
                hint = `This appears to be a ${result.spaPlatform} careers page which uses JavaScript to load job listings. ` +
                    `These pages cannot be scraped directly. Try one of these alternatives:\n\n` +
                    `1. Check if the employer has an RSS/XML job feed available\n` +
                    `2. Contact the employer for a direct API or feed URL\n` +
                    `3. For Oracle Recruiting Cloud, look for a feed URL like: /hcmRestApi/resources/latest/recruitingCEJobRequisitions`;
            } else if (result.isSpa) {
                hint = "This page appears to use JavaScript to render content dynamically (Single Page Application). " +
                    "Job listings are loaded after the initial page load and cannot be scraped directly. " +
                    "Try to find an XML/RSS feed or API endpoint from the employer.";
            } else {
                hint += " The page structure might not be supported, or there may be no jobs currently listed.";
            }

            return NextResponse.json({
                error: "No jobs found on the page",
                hint,
                feedType: "html",
                fields: [],
                isSpa: result.isSpa,
                spaPlatform: result.spaPlatform,
            }, { status: 400 });
        }

        // Simplify sample job for preview
        const sampleJob = result.jobs[0];

        return NextResponse.json({
            success: true,
            fields: result.fields,
            sampleJob,
            totalJobs: result.jobs.length,
            feedType: "html",
            feedStructure: "HTML Page (scraped)",
            nextPageUrl: result.nextPageUrl,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to scrape HTML";
        return NextResponse.json({
            error: `HTML scraping error: ${message}`,
            hint: "There was an error parsing the HTML page.",
        }, { status: 500 });
    }
}

/**
 * Process XML feed - falls back to HTML scraping if XML parsing fails
 */
async function processXmlFeed(xmlText: string, feedUrl: string): Promise<NextResponse> {
    // Parse XML with lenient options
    let parsed;
    try {
        parsed = await parseStringPromise(xmlText, {
            explicitArray: true,
            ignoreAttrs: false,
            strict: false,
            normalize: true,
            normalizeTags: false,
            trim: true,
        });
    } catch (parseError) {
        const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);

        // If XML parsing fails, try HTML scraping as a fallback
        // This handles cases where content was incorrectly identified as XML

        try {
            const htmlResult = processHtmlPage(xmlText, feedUrl);
            // Check if HTML scraping found jobs
            const htmlJson = await htmlResult.json();
            if (htmlJson.success && htmlJson.totalJobs > 0) {
                return NextResponse.json(htmlJson);
            }
        } catch (htmlError) {
        }

        // If HTML fallback didn't work, return the original XML error
        let hint = "The XML content has syntax errors.";
        if (parseErrorMsg.includes("Invalid character")) {
            hint = "The XML contains invalid characters. This might be an encoding issue or the content is actually HTML.";
        } else if (parseErrorMsg.includes("entity")) {
            hint = "The XML contains undefined entities (like &nbsp;). The feed may not be valid XML.";
        }

        return NextResponse.json({
            error: `XML parsing error: ${parseErrorMsg}`,
            hint,
            preview: xmlText.substring(0, 500) + "...",
        }, { status: 400 });
    }

    // Find the job items in the feed
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
        const topLevelKeys = Object.keys(parsed);
        return NextResponse.json({
            error: "No job items found in the XML feed.",
            hint: `Top-level elements: ${topLevelKeys.join(", ")}. This feed may have an unusual structure.`,
            fields: [],
            feedType: "xml",
        }, { status: 400 });
    }

    // Extract all unique field names from the first few jobs
    const fieldSet = new Set<string>();
    const sampleCount = Math.min(jobs.length, 5);

    for (let i = 0; i < sampleCount; i++) {
        extractXmlFields(jobs[i], "", fieldSet);
    }

    // Simplify sample job for preview
    const sampleJob = simplifyJobForPreview(jobs[0]);

    return NextResponse.json({
        success: true,
        fields: Array.from(fieldSet).sort(),
        sampleJob,
        totalJobs: jobs.length,
        feedType: "xml",
        feedStructure,
    });
}

function extractXmlFields(obj: any, prefix: string, fieldSet: Set<string>): void {
    if (typeof obj !== "object" || obj === null) return;

    for (const key of Object.keys(obj)) {
        if (key === "$") continue;

        const value = obj[key];

        if (Array.isArray(value)) {
            if (value.length > 0) {
                const firstElement = value[0];
                if (typeof firstElement === "string" || typeof firstElement === "number" || typeof firstElement === "boolean") {
                    fieldSet.add(key);
                } else if (typeof firstElement === "object") {
                    fieldSet.add(key);
                    extractXmlFields(firstElement, key, fieldSet);
                }
            }
        } else if (typeof value === "object") {
            extractXmlFields(value, prefix ? `${prefix}.${key}` : key, fieldSet);
        } else {
            fieldSet.add(key);
        }
    }
}

function simplifyJobForPreview(job: any): any {
    if (!job || typeof job !== "object") return job;

    const simplified: any = {};
    for (const key of Object.keys(job)) {
        if (key === "$") continue;

        const value = job[key];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                const first = value[0];
                if (typeof first === "string") {
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
