import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";
  return {
    rules: [
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "Facebot", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "LinkedInBot", allow: "/" },
      { userAgent: "Pinterest", allow: "/" },
      { userAgent: "Slackbot", allow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/admin/*", "/member/*", "/organization/*", "/api/*"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
