import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
  const staticPages = [
    "", "/about", "/contact", "/careers", "/education", "/education/schools",
    "/education/programs", "/education/scholarships", "/conferences",
    "/community", "/live", "/pricing",
  ];
  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));
  const authRoutes = ["/login", "/signup"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  return [...staticRoutes, ...authRoutes];
}
