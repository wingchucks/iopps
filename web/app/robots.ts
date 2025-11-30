import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin/*",
                    "/member/dashboard/*",
                    "/organization/*",
                    "/api/*",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
