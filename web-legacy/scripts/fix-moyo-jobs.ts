/**
 * One-time script to fix Moyo Jibodu's jobs
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-moyo-jobs.ts
 */

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Try to parse service account from base64 or JSON string
function getServiceAccountCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string } | null {
  // Try base64-encoded version first (most reliable for Vercel)
  const base64Str = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Str) {
    try {
      const jsonStr = Buffer.from(base64Str, "base64").toString("utf-8");
      const parsed = JSON.parse(jsonStr);
      console.log("✅ Parsed Firebase credentials from base64");
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", e);
    }
  }

  // Fall back to raw JSON
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      console.log("✅ Parsed Firebase credentials from JSON");
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  // Try individual env vars
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    console.log("✅ Parsed Firebase credentials from individual env vars");
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

// Initialize Firebase Admin
const credentials = getServiceAccountCredentials();
if (!credentials || !credentials.projectId || !credentials.clientEmail || !credentials.privateKey) {
  console.error("Firebase credentials not found. Need one of:");
  console.error("  - FIREBASE_SERVICE_ACCOUNT_BASE64");
  console.error("  - FIREBASE_SERVICE_ACCOUNT_JSON");
  console.error("  - NEXT_PUBLIC_FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  });
  console.log("✅ Firebase Admin initialized successfully\n");
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

const db = admin.firestore();

// Moyo Jibodu's user ID
const MOYO_USER_ID = "5xSpxt1ZcEhzfNAlDkWf28Os6dg2";

async function main() {
  console.log("Fixing Moyo Jibodu's jobs...\n");

  // First check Moyo's employer profile
  const employerDoc = await db.collection("employers").doc(MOYO_USER_ID).get();
  const employer = employerDoc.data();

  console.log("Employer Profile Status:");
  if (!employer) {
    console.log("  - Profile: MISSING");
  } else {
    console.log(`  - Organization: ${employer.organizationName || "Not set"}`);
    console.log(`  - Status: ${employer.status || "pending (default)"}`);
    console.log(`  - Description: ${employer.description ? "Set" : "Missing"}`);
    console.log(`  - Location: ${employer.location || "Missing"}`);
    console.log(`  - Logo: ${employer.logoUrl ? "Set" : "Missing"}`);
  }
  console.log("");

  // Find all of Moyo's jobs
  const jobsSnapshot = await db
    .collection("jobs")
    .where("employerId", "==", MOYO_USER_ID)
    .get();

  console.log(`Found ${jobsSnapshot.size} jobs from Moyo:\n`);

  let deactivatedCount = 0;
  for (const jobDoc of jobsSnapshot.docs) {
    const job = jobDoc.data();
    console.log(`Job: ${job.title}`);
    console.log(`  - ID: ${jobDoc.id}`);
    console.log(`  - Active: ${job.active}`);
    console.log(`  - Created: ${job.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}`);

    // Deactivate if active
    if (job.active === true) {
      await db.collection("jobs").doc(jobDoc.id).update({
        active: false,
        pendingReason: "employer_not_approved",
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deactivatedBy: "fix_script",
      });
      console.log(`  - DEACTIVATED (was active, employer not approved)`);
      deactivatedCount++;
    } else {
      console.log(`  - Already inactive`);
    }
    console.log("");
  }

  console.log("=".repeat(50));
  console.log(`Summary: Deactivated ${deactivatedCount} of ${jobsSnapshot.size} jobs`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Have Moyo complete their employer profile (name, description, location, logo)");
  console.log("2. Approve Moyo's profile in the admin dashboard");
  console.log("3. Moyo can then reactivate their jobs or post new ones");

  process.exit(0);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
