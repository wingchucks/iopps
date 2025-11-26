import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";

    // Static pages
    const staticPages = [
        "",
        "/about",
        "/contact",
        "/jobs",
        "/conferences",
        "/scholarships",
        "/powwows",
        "/shop",
        "/live",
        "/mobile",
    ];

    const staticRoutes = staticPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: route === "" ? 1 : 0.8,
    }));

    // Auth pages
    const authPages = [
        "/login",
        "/signup",
    ];

    const authRoutes = authPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
    }));

    return [...staticRoutes, ...authRoutes];
}
