
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { parseStringPromise } from "xml2js";
import { decode } from "he";

// Initialize Firebase Admin
// If env vars are set for production, use them. Otherwise, check for emulator.
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        })
    });
    console.log("🔥 Initialized with Production config");
} else {
    // Fallback to emulator defaults if no prod creds
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
    process.env['GCLOUD_PROJECT'] = 'demo-iopps';
    initializeApp({
        projectId: 'demo-iopps',
    });
    console.log("🔥 Initialized with Emulator config");
}

const db = getFirestore();

const RSS_FEED_URL = "https://iopps.ca/feeds/standard.xml";

interface JobXML {
    title: string[];
    description: string[];
    city: string[];
    state: string[];
    country: string[];
    remote: string[];
    applyurl: string[];
    company: string[];
    expirationdate: string[];
    category: string[];
    url: string[];
    date: string[];
}

async function importRssJobs() {
    console.log(`\n📡 Fetching RSS feed from ${RSS_FEED_URL}...`);

    try {
        const response = await fetch(RSS_FEED_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch feed: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const parsed = await parseStringPromise(xmlText);
        const jobs = parsed.source?.job || [];

        console.log(`   Found ${jobs.length} jobs in feed.`);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const jobXML of jobs) {
            try {
                const job = jobXML as JobXML;
                const title = job.title?.[0] || "Unknown Title";
                const applyUrl = job.applyurl?.[0] || "";

                if (!applyUrl) {
                    console.log(`   ⚠️  Skipping "${title}": No application URL`);
                    errors++;
                    continue;
                }

                // Check for duplicates based on applicationLink
                const existing = await db.collection("jobs")
                    .where("applicationLink", "==", applyUrl)
                    .limit(1)
                    .get();

                if (!existing.empty) {
                    // console.log(`   ⏭️  Skipping "${title}": Already exists`);
                    skipped++;
                    continue;
                }

                // Map fields
                const city = job.city?.[0] || "";
                const state = job.state?.[0] || "";
                let location = city;
                if (state) {
                    location = location ? `${location}, ${state}` : state;
                }
                if (!location) location = "Remote";

                const remoteFlag = job.remote?.[0]?.toLowerCase() === "yes";
                const description = decode(job.description?.[0] || "");
                const company = job.company?.[0] || "Imported Employer";

                // Parse dates
                let closingDate = null;
                if (job.expirationdate?.[0]) {
                    try {
                        closingDate = new Date(job.expirationdate[0]);
                    } catch { }
                }

                let createdAt = new Date();
                if (job.date?.[0]) {
                    try {
                        createdAt = new Date(job.date[0]);
                    } catch { }
                }

                // Create job document
                const jobData = {
                    employerId: "rss-imported-employer", // Placeholder, could be mapped to real employer if needed
                    employerName: company,
                    title: title,
                    description: description,
                    location: location,
                    employmentType: "Full-time",
                    remoteFlag: remoteFlag,
                    applicationLink: applyUrl,
                    closingDate: closingDate ? Timestamp.fromDate(closingDate) : null,
                    active: true,
                    createdAt: Timestamp.fromDate(createdAt),
                    viewsCount: 0,
                    applicationsCount: 0,
                    source: "rss-import",
                    originalUrl: job.url?.[0] || applyUrl,
                };

                const docRef = await db.collection("jobs").add(jobData);
                // Update with its own ID if your app relies on 'id' field in doc
                await docRef.update({ id: docRef.id });

                console.log(`   ✅ Imported: "${title}" at ${company}`);
                imported++;

            } catch (err: unknown) {
                console.error(`   ❌ Error processing job: ${err instanceof Error ? err.message : err}`);
                errors++;
            }
        }

        console.log("\n========================================");
        console.log("  IMPORT COMPLETE");
        console.log("========================================");
        console.log(`  Imported: ${imported}`);
        console.log(`  Skipped:  ${skipped}`);
        console.log(`  Errors:   ${errors}`);
        console.log("========================================\n");

    } catch (error: unknown) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }
}

importRssJobs();
