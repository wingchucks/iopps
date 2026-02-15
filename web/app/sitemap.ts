import { MetadataRoute } from "next";
import { adminDb as db } from "@/lib/firebase-admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

    // Static pages
    const staticPages = [
        "",
        "/about",
        "/contact",
        "/careers",
        "/education",
        "/education/schools",
        "/education/programs",
        "/education/scholarships",
        "/conferences",
        "/community",
        "/pricing",
    ];

    const staticRoutes = staticPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: route === "" ? 1 : 0.8,
    }));

    // Auth pages
    const authRoutes = ["/login", "/signup"].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
    }));

    // Dynamic pages from Firestore
    const dynamicRoutes: MetadataRoute.Sitemap = [];

    if (db) {
        try {
            // Active jobs
            const jobsSnap = await db
                .collection("jobs")
                .where("active", "==", true)
                .limit(500)
                .get();
            for (const doc of jobsSnap.docs) {
                dynamicRoutes.push({
                    url: `${baseUrl}/careers/${doc.id}`,
                    lastModified: doc.data().updatedAt?.toDate?.() ?? new Date(),
                    changeFrequency: "weekly",
                    priority: 0.7,
                });
            }

            // Active scholarships
            const scholarshipsSnap = await db
                .collection("scholarships")
                .where("active", "==", true)
                .limit(500)
                .get();
            for (const doc of scholarshipsSnap.docs) {
                dynamicRoutes.push({
                    url: `${baseUrl}/education/scholarships/${doc.id}`,
                    lastModified: doc.data().updatedAt?.toDate?.() ?? new Date(),
                    changeFrequency: "weekly",
                    priority: 0.7,
                });
            }

            // Active conferences
            const conferencesSnap = await db
                .collection("conferences")
                .where("active", "==", true)
                .limit(500)
                .get();
            for (const doc of conferencesSnap.docs) {
                dynamicRoutes.push({
                    url: `${baseUrl}/conferences/${doc.id}`,
                    lastModified: doc.data().updatedAt?.toDate?.() ?? new Date(),
                    changeFrequency: "weekly",
                    priority: 0.7,
                });
            }

            // Active powwows
            const powwowsSnap = await db
                .collection("powwows")
                .where("active", "==", true)
                .limit(500)
                .get();
            for (const doc of powwowsSnap.docs) {
                dynamicRoutes.push({
                    url: `${baseUrl}/community/powwows/${doc.id}`,
                    lastModified: doc.data().updatedAt?.toDate?.() ?? new Date(),
                    changeFrequency: "weekly",
                    priority: 0.7,
                });
            }
        } catch (e) {
            console.error("Sitemap: failed to fetch dynamic routes", e);
        }
    }

    return [...staticRoutes, ...authRoutes, ...dynamicRoutes];
}
