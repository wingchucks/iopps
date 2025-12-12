/**
 * Fix Employer Roles Recovery Script
 *
 * This script restores the "employer" role for all users who have employer profiles.
 * Run this after the migration script accidentally overwrote roles to "member".
 *
 * Usage: npx tsx scripts/fix-employer-roles.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (same as migration script)
function tryParseServiceAccountJson(): { projectId?: string; clientEmail?: string; privateKey?: string } | null {
  const base64Str = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Str) {
    try {
      const jsonStr = Buffer.from(base64Str, "base64").toString("utf-8");
      const parsed = JSON.parse(jsonStr);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", e);
    }
  }
  return null;
}

if (!getApps().length) {
  const serviceAccount = tryParseServiceAccountJson();
  if (!serviceAccount) {
    console.error("❌ Missing Firebase credentials");
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId!,
      clientEmail: serviceAccount.clientEmail!,
      privateKey: serviceAccount.privateKey!,
    }),
  });
}

const db = getFirestore();

async function fixEmployerRoles() {
  console.log("\n========================================");
  console.log("  FIX EMPLOYER ROLES");
  console.log("========================================\n");

  // Get all employers (excluding soft-deleted)
  const employersSnapshot = await db.collection("employers").get();

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Found ${employersSnapshot.size} employer profiles\n`);

  for (const employerDoc of employersSnapshot.docs) {
    const employerData = employerDoc.data();
    const userId = employerData.userId;
    const orgName = employerData.organizationName || "Unknown";

    // Skip soft-deleted employers
    if (employerData.deletedAt) {
      console.log(`   ⏭️  Skipped (deleted): ${orgName}`);
      skipped++;
      continue;
    }

    if (!userId) {
      console.log(`   ⚠️  No userId for: ${orgName}`);
      skipped++;
      continue;
    }

    try {
      // Get current user document
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        console.log(`   ⚠️  User not found: ${orgName} (${userId})`);
        skipped++;
        continue;
      }

      const userData = userDoc.data();
      const currentRole = userData?.role;

      // Only fix if role is not already "employer" or "admin"
      if (currentRole === "employer" || currentRole === "admin") {
        console.log(`   ✓ Already correct: ${orgName} (${currentRole})`);
        skipped++;
        continue;
      }

      // Update role to employer
      await db.collection("users").doc(userId).update({
        role: "employer",
      });

      console.log(`   ✅ Fixed: ${orgName} (${currentRole} → employer)`);
      fixed++;
    } catch (error: any) {
      console.log(`   ❌ Error: ${orgName} - ${error.message}`);
      errors++;
    }
  }

  console.log("\n========================================");
  console.log("  RESULTS");
  console.log("========================================\n");
  console.log(`  Fixed:   ${fixed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
  console.log("");
}

fixEmployerRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
