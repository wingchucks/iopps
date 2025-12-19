import { MetadataRoute } from "next";
import { listJobPostings } from "@/lib/firestore/jobs";
import { listScholarships } from "@/lib/firestore/scholarships";
import { listConferences } from "@/lib/firestore/conferences";
import { listPowwowEvents } from "@/lib/firestore/powwows";
import { listEmployers } from "@/lib/firestore/employers";
import { listApprovedVendors } from "@/lib/firestore/vendors";
import { listTrainingPrograms } from "@/lib/firestore/training";
import { listLiveStreams } from "@/lib/firestore/livestreams";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";

// Helper to safely convert Firestore timestamps to Date
function toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
        return timestamp.toDate();
    }
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000);
    }
    if (typeof timestamp === "string" || typeof timestamp === "number") {
        return new Date(timestamp);
    }
    return new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages
    const staticPages = [
        { path: "", priority: 1.0, changeFreq: "daily" as const },
        { path: "/about", priority: 0.7, changeFreq: "monthly" as const },
        { path: "/contact", priority: 0.7, changeFreq: "monthly" as const },
        { path: "/pricing", priority: 0.8, changeFreq: "weekly" as const },
        { path: "/jobs", priority: 0.9, changeFreq: "daily" as const },
        { path: "/jobs-training", priority: 0.9, changeFreq: "daily" as const },
        { path: "/jobs-training/jobs", priority: 0.9, changeFreq: "daily" as const },
        { path: "/conferences", priority: 0.8, changeFreq: "daily" as const },
        { path: "/scholarships", priority: 0.8, changeFreq: "daily" as const },
        { path: "/powwows", priority: 0.8, changeFreq: "daily" as const },
        { path: "/marketplace", priority: 0.8, changeFreq: "daily" as const },
        { path: "/live", priority: 0.7, changeFreq: "daily" as const },
        { path: "/mobile", priority: 0.5, changeFreq: "monthly" as const },
        { path: "/organizations", priority: 0.7, changeFreq: "weekly" as const },
    ];

    const staticRoutes: MetadataRoute.Sitemap = staticPages.map((page) => ({
        url: `${baseUrl}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFreq,
        priority: page.priority,
    }));

    // Auth pages (lower priority, not frequently changed)
    const authPages = ["/login", "/signup", "/register"];
    const authRoutes: MetadataRoute.Sitemap = authPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
    }));

    // Dynamic content - fetch all in parallel for performance
    const [jobs, scholarships, conferences, powwows, employers, vendors, trainingPrograms, liveStreams] = await Promise.all([
        listJobPostings({ activeOnly: true }).catch(() => []),
        listScholarships().catch(() => []),
        listConferences().catch(() => []),
        listPowwowEvents().catch(() => []),
        listEmployers("approved").catch(() => []),
        listApprovedVendors().catch(() => []),
        listTrainingPrograms({ activeOnly: true }).catch(() => []),
        listLiveStreams().catch(() => []),
    ]);

    // Job routes
    const jobRoutes: MetadataRoute.Sitemap = jobs
        .filter((job) => job.active && job.id)
        .map((job) => ({
            url: `${baseUrl}/jobs-training/${job.id}`,
            lastModified: toDate(job.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

    // Scholarship routes
    const scholarshipRoutes: MetadataRoute.Sitemap = scholarships
        .filter((s) => s.active && s.id)
        .map((scholarship) => ({
            url: `${baseUrl}/scholarships/${scholarship.id}`,
            lastModified: toDate(scholarship.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }));

    // Conference routes
    const conferenceRoutes: MetadataRoute.Sitemap = conferences
        .filter((c) => c.active && c.id)
        .map((conference) => ({
            url: `${baseUrl}/conferences/${conference.id}`,
            lastModified: toDate(conference.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }));

    // Powwow routes
    const powwowRoutes: MetadataRoute.Sitemap = powwows
        .filter((p) => p.active && p.id)
        .map((powwow) => ({
            url: `${baseUrl}/powwows/${powwow.id}`,
            lastModified: toDate(powwow.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }));

    // Employer profile routes
    const employerRoutes: MetadataRoute.Sitemap = employers
        .filter((e) => e.id && e.status === "approved")
        .map((employer) => ({
            url: `${baseUrl}/employers/${employer.id}`,
            lastModified: toDate(employer.updatedAt || employer.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.6,
        }));

    // Vendor/marketplace routes (using slug if available, otherwise id)
    const vendorRoutes: MetadataRoute.Sitemap = vendors
        .filter((v) => v.slug || v.id)
        .map((vendor) => ({
            url: `${baseUrl}/marketplace/${vendor.slug || vendor.id}`,
            lastModified: toDate(vendor.updatedAt || vendor.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.6,
        }));

    // Training program routes
    const trainingRoutes: MetadataRoute.Sitemap = trainingPrograms
        .filter((p) => p.active && p.id)
        .map((program) => ({
            url: `${baseUrl}/jobs-training/programs/${program.id}`,
            lastModified: toDate(program.updatedAt || program.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }));

    // Live stream routes
    const liveStreamRoutes: MetadataRoute.Sitemap = liveStreams
        .filter((s) => s.id)
        .map((stream) => ({
            url: `${baseUrl}/live/${stream.id}`,
            lastModified: toDate(stream.createdAt),
            changeFrequency: "daily" as const,
            priority: 0.6,
        }));

    return [
        ...staticRoutes,
        ...authRoutes,
        ...jobRoutes,
        ...scholarshipRoutes,
        ...conferenceRoutes,
        ...powwowRoutes,
        ...employerRoutes,
        ...vendorRoutes,
        ...trainingRoutes,
        ...liveStreamRoutes,
    ];
}
