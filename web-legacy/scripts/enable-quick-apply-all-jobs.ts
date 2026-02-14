/**
 * Migration Script: Enable Quick Apply for All Jobs
 *
 * This script updates all existing job postings to enable the Quick Apply feature.
 * Quick Apply is now the ONLY application method on IOPPS, centralizing all applications.
 *
 * What this script does:
 * - Sets quickApplyEnabled: true for all jobs
 * - Preserves existing applicationLink and applicationEmail fields (for reference)
 * - Uses batching to handle large datasets (Firestore limit: 500 operations per batch)
 *
 * Usage:
 *   npx tsx scripts/enable-quick-apply-all-jobs.ts
 */

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Initialize Firebase Admin using environment variables
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase credentials.');
    console.error('   Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,');
    console.error('   and FIREBASE_PRIVATE_KEY environment variables.');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        })
    });
}

const db = admin.firestore();

async function enableQuickApplyForAllJobs() {
    console.log("🚀 Starting migration: Enable Quick Apply for all jobs");
    console.log("=" .repeat(60));

    try {
        // Get all jobs
        const jobsRef = db.collection("jobs");
        const snapshot = await jobsRef.get();

        if (snapshot.empty) {
            console.log("⚠️  No jobs found in the database.");
            return;
        }

        console.log(`📊 Found ${snapshot.size} jobs to update`);
        console.log();

        let batch = db.batch();
        let batchCount = 0;
        let totalUpdated = 0;
        let alreadyEnabled = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Check if already enabled
            if (data.quickApplyEnabled === true) {
                alreadyEnabled++;
                continue;
            }

            // Update the document
            batch.update(doc.ref, {
                quickApplyEnabled: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            batchCount++;
            totalUpdated++;

            // Commit batch when reaching Firestore limit (500)
            if (batchCount === 500) {
                await batch.commit();
                console.log(`✅ Committed batch: ${totalUpdated} jobs updated so far`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Commit remaining operations
        if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Committed final batch: ${batchCount} jobs`);
        }

        console.log();
        console.log("=" .repeat(60));
        console.log("✨ Migration completed successfully!");
        console.log(`📈 Total jobs processed: ${snapshot.size}`);
        console.log(`✅ Jobs updated: ${totalUpdated}`);
        console.log(`⏭️  Jobs already enabled: ${alreadyEnabled}`);
        console.log("=" .repeat(60));
        console.log();
        console.log("📝 Note: Existing applicationLink and applicationEmail fields");
        console.log("   have been preserved in the database for reference.");
        console.log("   They will no longer be displayed in the UI.");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

// Run the migration
enableQuickApplyForAllJobs()
    .then(() => {
        console.log("\n🎉 All done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Migration failed with error:", error);
        process.exit(1);
    });
