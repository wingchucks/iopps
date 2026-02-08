import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";

    return {
        rules: [
            // Explicitly allow social media crawlers full access for Open Graph scraping
            {
                userAgent: "facebookexternalhit",
                allow: "/",
            },
            {
                userAgent: "Facebot",
                allow: "/",
            },
            {
                userAgent: "Twitterbot",
                allow: "/",
            },
            {
                userAgent: "LinkedInBot",
                allow: "/",
            },
            {
                userAgent: "Pinterest",
                allow: "/",
            },
            {
                userAgent: "Slackbot",
                allow: "/",
            },
            // General rules for all other crawlers
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin/*",
                    "/member/*",
                    "/organization/*",
                    "/api/*",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
