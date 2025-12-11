import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

/**
 * Public XML job feed endpoint
 * GET /feeds/standard.xml
 *
 * Returns all active jobs in a standard XML format that can be consumed by job aggregators
 */
export async function GET() {
    try {
        // Fetch active jobs, excluding noIndex jobs
        const jobsSnapshot = await db!
            .collection("jobs")
            .where("active", "==", true)
            .orderBy("createdAt", "desc")
            .limit(500) // Limit to prevent huge feeds
            .get();

        const jobs = jobsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((job: any) => !job.noIndex); // Exclude noIndex jobs from public feed

        // Build XML
        const xml = buildJobFeedXml(jobs);

        return new NextResponse(xml, {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
        });
    } catch (error) {
        console.error("Error generating job feed:", error);
        return new NextResponse(
            `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate feed</error>`,
            {
                status: 500,
                headers: { "Content-Type": "application/xml" },
            }
        );
    }
}

function escapeXml(str: string | undefined | null): string {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
        // Remove control characters that are invalid in XML
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function formatDate(timestamp: any): string {
    if (!timestamp) return "";
    try {
        let date: Date;
        if (timestamp._seconds) {
            date = new Date(timestamp._seconds * 1000);
        } else if (timestamp.toDate) {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }
        return date.toISOString();
    } catch {
        return "";
    }
}

function buildJobFeedXml(jobs: any[]): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://jobs.iopps.ca";
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
    <publisher>IOPPS - Indigenous Opportunities</publisher>
    <publisherurl>${escapeXml(baseUrl)}</publisherurl>
    <lastBuildDate>${now}</lastBuildDate>
    <totalJobs>${jobs.length}</totalJobs>
`;

    for (const job of jobs) {
        const jobUrl = `${baseUrl}/jobs/${job.id}`;
        const applyUrl = job.applicationLink || jobUrl;
        const createdAt = formatDate(job.createdAt);
        const closingDate = formatDate(job.closingDate);

        // Build location string
        let location = job.location || "";
        if (job.remoteFlag && !location.toLowerCase().includes("remote")) {
            location = location ? `${location} (Remote Available)` : "Remote";
        }

        xml += `    <job>
        <title><![CDATA[${job.title || "Untitled Position"}]]></title>
        <date>${createdAt}</date>
        <referencenumber>${escapeXml(job.id)}</referencenumber>
        <url>${escapeXml(jobUrl)}</url>
        <company><![CDATA[${job.employerName || ""}]]></company>
        <city><![CDATA[${location}]]></city>
        <country>Canada</country>
        <description><![CDATA[${job.description || ""}]]></description>
        <jobtype>${escapeXml(job.employmentType || "Full-time")}</jobtype>
        <applyurl>${escapeXml(applyUrl)}</applyurl>
`;

        // Optional fields
        if (job.category) {
            xml += `        <category><![CDATA[${job.category}]]></category>\n`;
        }
        if (job.salaryRange?.min || job.salaryRange?.max || job.salary?.display) {
            const salaryDisplay = job.salary?.display ||
                (job.salaryRange?.min && job.salaryRange?.max
                    ? `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`
                    : job.salaryRange?.min
                        ? `From $${job.salaryRange.min.toLocaleString()}`
                        : job.salaryRange?.max
                            ? `Up to $${job.salaryRange.max.toLocaleString()}`
                            : "");
            if (salaryDisplay) {
                xml += `        <salary><![CDATA[${salaryDisplay}]]></salary>\n`;
            }
        }
        if (closingDate) {
            xml += `        <expirationdate>${closingDate}</expirationdate>\n`;
        }
        if (job.requirements) {
            xml += `        <requirements><![CDATA[${job.requirements}]]></requirements>\n`;
        }
        if (job.benefits) {
            xml += `        <benefits><![CDATA[${job.benefits}]]></benefits>\n`;
        }
        if (job.indigenousPreference) {
            xml += `        <indigenouspreference>true</indigenouspreference>\n`;
        }
        if (job.remoteFlag) {
            xml += `        <remote>yes</remote>\n`;
        }

        xml += `    </job>\n`;
    }

    xml += `</source>`;

    return xml;
}
