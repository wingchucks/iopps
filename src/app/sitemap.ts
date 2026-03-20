import type { MetadataRoute } from "next";
import { adminDb } from "@/lib/firebase-admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.iopps.ca";

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

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" || path === "/events" ? 0.9 : 0.7,
  }));

  // Dynamic routes from Firestore collections
  const dynamicEntries: MetadataRoute.Sitemap = [];

  if (adminDb) {
    try {
      const collections: { name: string; prefix: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
        { name: "jobs", prefix: "/jobs", priority: 0.8, changeFrequency: "daily" },
        { name: "events", prefix: "/events", priority: 0.8, changeFrequency: "daily" },
        { name: "scholarships", prefix: "/scholarships", priority: 0.8, changeFrequency: "weekly" },
        { name: "training_programs", prefix: "/training", priority: 0.6, changeFrequency: "weekly" },
        { name: "organizations", prefix: "/schools", priority: 0.6, changeFrequency: "weekly" },
        { name: "shopListings", prefix: "/shop", priority: 0.5, changeFrequency: "weekly" },
      ];

      const snapshots = await Promise.all(
        collections.map((c) =>
          adminDb!.collection(c.name).select("slug").get()
        )
      );

      snapshots.forEach((snap, i) => {
        const col = collections[i];
        snap.docs.forEach((doc) => {
          const slug = doc.data().slug || doc.id;
          dynamicEntries.push({
            url: `${base}${col.prefix}/${slug}`,
            lastModified: new Date(),
            changeFrequency: col.changeFrequency,
            priority: col.priority,
          });
        });
      });

      // Stories and programs from posts collection
      const postsSnap = await adminDb.collection("posts")
        .where("type", "in", ["story", "spotlight", "program", "conference"])
        .select("slug", "type")
        .get();

      postsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const slug = data.slug || doc.id.replace(/^(story|spotlight|program|conference)-/, "");
        const prefix = data.type === "program" ? "/programs"
          : data.type === "conference" ? "/events"
          : "/stories";
        dynamicEntries.push({
          url: `${base}${prefix}/${slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      });
    } catch (err) {
      console.error("Sitemap: failed to fetch dynamic routes:", err);
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
