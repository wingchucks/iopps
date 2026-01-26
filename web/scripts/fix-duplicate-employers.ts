/**
 * Find and fix duplicate employer records in Firestore
 *
 * Usage: npx tsx scripts/fix-duplicate-employers.ts [--execute]
 *
 * Without --execute: Dry run, shows what would be deleted
 * With --execute: Actually soft-deletes duplicate records
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as os from "os";

// Load env from user home .env.local (where Firebase credentials are)
dotenv.config({ path: path.join(os.homedir(), ".env.local") });
// Also try web/.env.local as fallback
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
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

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const serviceAccount = tryParseServiceAccountJson();

  if (serviceAccount?.projectId && serviceAccount?.clientEmail && serviceAccount?.privateKey) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    });
  } else {
    throw new Error("Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_BASE64 in .env.local");
  }

  return getFirestore();
}

interface EmployerRecord {
  id: string;
  organizationName: string;
  status: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  location?: string;
  industry?: string;
  website?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId?: string;
}

interface DuplicateGroup {
  name: string;
  records: EmployerRecord[];
  keep: EmployerRecord;
  delete: EmployerRecord[];
}

/**
 * Calculate a "completeness score" for an employer record
 * Higher score = more complete profile
 */
function getCompletenessScore(record: EmployerRecord): number {
  let score = 0;

  if (record.description && record.description.length > 50) score += 3;
  else if (record.description) score += 1;

  if (record.logoUrl) score += 2;
  if (record.bannerUrl) score += 2;
  if (record.location) score += 1;
  if (record.industry) score += 1;
  if (record.website) score += 1;
  if (record.slug) score += 2;
  if (record.status === "approved") score += 3;

  // Prefer records with more recent activity
  if (record.updatedAt) {
    const daysSinceUpdate = (Date.now() - record.updatedAt.toMillis()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 2;
    else if (daysSinceUpdate < 90) score += 1;
  }

  return score;
}

async function findDuplicates(db: FirebaseFirestore.Firestore): Promise<DuplicateGroup[]> {
  console.log("Fetching all employer records...");

  const snapshot = await db.collection("employers").get();
  const records: EmployerRecord[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Skip already deleted records
    if (data.deletedAt || data.status === "deleted") return;

    records.push({
      id: doc.id,
      organizationName: data.organizationName || "",
      status: data.status || "pending",
      slug: data.slug,
      description: data.description,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      location: data.location,
      industry: data.industry,
      website: data.website,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      userId: data.userId,
    });
  });

  console.log(`Found ${records.length} active employer records`);

  // Group by normalized organization name
  const groups = new Map<string, EmployerRecord[]>();

  for (const record of records) {
    const normalizedName = record.organizationName.toLowerCase().trim();
    if (!normalizedName) continue;

    const existing = groups.get(normalizedName) || [];
    existing.push(record);
    groups.set(normalizedName, existing);
  }

  // Find groups with duplicates
  const duplicates: DuplicateGroup[] = [];

  for (const [, groupRecords] of groups) {
    if (groupRecords.length > 1) {
      // Sort by completeness score (highest first)
      groupRecords.sort((a, b) => getCompletenessScore(b) - getCompletenessScore(a));

      duplicates.push({
        name: groupRecords[0].organizationName,
        records: groupRecords,
        keep: groupRecords[0],
        delete: groupRecords.slice(1),
      });
    }
  }

  return duplicates;
}

function printDuplicateReport(duplicates: DuplicateGroup[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("DUPLICATE EMPLOYER RECORDS REPORT");
  console.log("=".repeat(80));

  if (duplicates.length === 0) {
    console.log("\nNo duplicate records found!");
    return;
  }

  console.log(`\nFound ${duplicates.length} organization(s) with duplicate records:\n`);

  for (const group of duplicates) {
    console.log("-".repeat(60));
    console.log(`Organization: ${group.name}`);
    console.log(`Total records: ${group.records.length}`);
    console.log("");

    for (let i = 0; i < group.records.length; i++) {
      const record = group.records[i];
      const score = getCompletenessScore(record);
      const isKeep = i === 0;

      console.log(`  ${isKeep ? "✓ KEEP" : "✗ DELETE"} [Score: ${score}]`);
      console.log(`    ID: ${record.id}`);
      console.log(`    Status: ${record.status}`);
      console.log(`    Slug: ${record.slug || "(none)"}`);
      console.log(`    Description: ${record.description ? record.description.substring(0, 50) + "..." : "(none)"}`);
      console.log(`    Logo: ${record.logoUrl ? "Yes" : "No"}`);
      console.log(`    Location: ${record.location || "(none)"}`);
      console.log(`    UserId: ${record.userId || "(none)"}`);
      console.log("");
    }
  }

  const totalToDelete = duplicates.reduce((sum, g) => sum + g.delete.length, 0);
  console.log("=".repeat(80));
  console.log(`SUMMARY: ${totalToDelete} record(s) to soft-delete across ${duplicates.length} organization(s)`);
  console.log("=".repeat(80));
}

async function softDeleteDuplicates(
  db: FirebaseFirestore.Firestore,
  duplicates: DuplicateGroup[],
  dryRun = true
): Promise<void> {
  if (dryRun) {
    console.log("\n[DRY RUN] Would soft-delete the following records:");
  } else {
    console.log("\n[EXECUTING] Soft-deleting duplicate records...");
  }

  const batch = db.batch();
  let count = 0;

  for (const group of duplicates) {
    for (const record of group.delete) {
      console.log(`  - ${record.organizationName} (ID: ${record.id})`);

      if (!dryRun) {
        const ref = db.collection("employers").doc(record.id);
        batch.update(ref, {
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: "system:duplicate-cleanup",
          deleteReason: `Duplicate of ${group.keep.id}`,
          status: "deleted",
          directoryVisible: false,
          isDirectoryVisible: false,
        });
        count++;
      }
    }
  }

  if (!dryRun && count > 0) {
    await batch.commit();
    console.log(`\nSuccessfully soft-deleted ${count} duplicate record(s)`);

    // Also remove from directory_index
    console.log("Removing from directory_index...");
    for (const group of duplicates) {
      for (const record of group.delete) {
        try {
          await db.collection("directory_index").doc(record.id).delete();
        } catch {
          // May not exist, that's fine
        }
      }
    }
    console.log("Done!");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");

  console.log("Initializing Firebase Admin...");
  const db = initFirebaseAdmin();

  console.log("Finding duplicate employer records...\n");

  const duplicates = await findDuplicates(db);
  printDuplicateReport(duplicates);

  if (duplicates.length > 0) {
    if (execute) {
      console.log("\n⚠️  --execute flag provided. Proceeding with soft-delete...");
      await softDeleteDuplicates(db, duplicates, false);
    } else {
      console.log("\n📋 This was a DRY RUN. To actually delete duplicates, run with --execute flag:");
      console.log("   npx tsx scripts/fix-duplicate-employers.ts --execute");
      await softDeleteDuplicates(db, duplicates, true);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
