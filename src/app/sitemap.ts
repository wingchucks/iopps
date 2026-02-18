import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://iopps-fresh.vercel.app";

  const staticPages = [
    "",
    "/login",
    "/signup",
    "/forgot-password",
    "/feed",
    "/jobs",
    "/events",
    "/scholarships",
    "/programs",
    "/stories",
    "/partners",
    "/schools",
    "/learning",
    "/shop",
    "/about",
    "/contact",
    "/pricing",
    "/terms",
    "/org/signup",
  ];

  return staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" || path === "/events" ? 0.9 : 0.7,
  }));
}
