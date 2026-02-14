import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, query, where } from "firebase/firestore";

export const revalidate = 300; // Revalidate every 5 minutes

// Cache stats for 5 minutes
let cachedStats: { jobs: number; conferences: number; scholarships: number; vendors: number } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        // Return cached stats if still valid
        if (cachedStats && Date.now() - cacheTime < CACHE_DURATION) {
            return NextResponse.json(cachedStats, {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            });
        }

        // Check if Firebase is available
        if (!db) {
            // Return fallback values in demo mode
            return NextResponse.json({
                jobs: 500,
                conferences: 50,
                scholarships: 75,
                vendors: 100,
            });
        }

        // Count active jobs
        const activeJobsQuery = query(
            collection(db, "jobs"),
            where("active", "==", true)
        );
        const jobsSnap = await getCountFromServer(activeJobsQuery);
        const jobs = jobsSnap.data().count;

        // Count active conferences
        const activeConferencesQuery = query(
            collection(db, "conferences"),
            where("active", "==", true)
        );
        const conferencesSnap = await getCountFromServer(activeConferencesQuery);
        const conferences = conferencesSnap.data().count;

        // Count active scholarships
        const activeScholarshipsQuery = query(
            collection(db, "scholarships"),
            where("active", "==", true)
        );
        const scholarshipsSnap = await getCountFromServer(activeScholarshipsQuery);
        const scholarships = scholarshipsSnap.data().count;

        // Count approved vendors
        const approvedVendorsQuery = query(
            collection(db, "vendors"),
            where("approvalStatus", "==", "approved")
        );
        const vendorsSnap = await getCountFromServer(approvedVendorsQuery);
        const vendors = vendorsSnap.data().count;

        // Cache the results
        cachedStats = { jobs, conferences, scholarships, vendors };
        cacheTime = Date.now();

        return NextResponse.json(cachedStats, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("Error fetching stats:", error);

        // Return fallback values on error
        return NextResponse.json({
            jobs: 500,
            conferences: 50,
            scholarships: 75,
            vendors: 100,
        });
    }
}
