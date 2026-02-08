/**
 * Migration Script: MySmartJobBoard → IOPPS Firebase
 *
 * Usage:
 * 1. Export CSV files from MySmartJobBoard admin panel
 * 2. Place them in the /scripts/migration-data/ folder
 * 3. Run: npx tsx scripts/migrate-from-smartjobboard.ts
 *
 * Expected files:
 * - migration-data/jobs.csv
 * - migration-data/employers.csv
 * - migration-data/candidates.csv (optional)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

// Helper to parse the private key from various formats
function parsePrivateKey(key: string | undefined): string | null {
  if (!key) return null;

  let parsedKey = key.trim();

  // Remove surrounding quotes if present
  if ((parsedKey.startsWith('"') && parsedKey.endsWith('"')) ||
      (parsedKey.startsWith("'") && parsedKey.endsWith("'")) ||
      (parsedKey.startsWith('`') && parsedKey.endsWith('`'))) {
    parsedKey = parsedKey.slice(1, -1);
  }

  // Handle double-escaped newlines
  parsedKey = parsedKey.replace(/\\\\n/g, "\\n");
  parsedKey = parsedKey.replace(/\\n/g, "\n");
  parsedKey = parsedKey.replace(/\r\n/g, "\n");

  // Try base64 decode if not PEM
  if (!parsedKey.includes("-----BEGIN")) {
    try {
      const decoded = Buffer.from(parsedKey, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        parsedKey = decoded;
      }
    } catch {}
  }

  if (!parsedKey.includes("-----BEGIN PRIVATE KEY-----")) {
    return null;
  }

  return parsedKey;
}

// Try to parse service account from JSON string or base64
function tryParseServiceAccountJson(): { projectId?: string; clientEmail?: string; privateKey?: string } | null {
  // Try base64-encoded version first
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
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  return null;
}

// Initialize Firebase Admin
if (!getApps().length) {
  // Check if running against emulator
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-iopps',
    });
    console.log("🔥 Initialized with Emulator config");
  } else {
    // Try service-account.json first
    const serviceAccountPath = path.join(__dirname, '../../service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("🔥 Initialized with service-account.json");
    } else {
      // Try JSON service account from env vars
      const serviceAccount = tryParseServiceAccountJson();

      const projectId = serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = serviceAccount?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = serviceAccount?.privateKey || parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

      if (!projectId || !clientEmail || !privateKey) {
        console.error("❌ Missing Firebase credentials.");
        console.error("   Options:");
        console.error("   1. Place service-account.json in project root");
        console.error("   2. Set FIREBASE_SERVICE_ACCOUNT_BASE64 in .env.local");
        console.error("   3. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local");
        process.exit(1);
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("🔥 Initialized with environment credentials");
    }
  }
}

const db = getFirestore();
const auth = getAuth();

// ============================================
// CSV Parser (handles multi-line quoted fields)
// ============================================

function parseCSV(content: string): Record<string, string>[] {
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // Character inside quotes (including newlines)
        currentField += char;
        i++;
        continue;
      }
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField.trim());
      currentField = "";
      i++;
      continue;
    }

    if (char === '\r' && nextChar === '\n') {
      // Windows line ending
      currentRow.push(currentField.trim());
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      i += 2;
      continue;
    }

    if (char === '\n') {
      // Unix line ending
      currentRow.push(currentField.trim());
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || currentRow[0] !== "") {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // First row is headers
  const headers = rows[0];
  const results: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    // Skip rows that don't have enough columns (likely parsing errors)
    if (values.length < headers.length / 2) {
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    results.push(row);
  }

  return results;
}

// ============================================
// Data Transformers
// ============================================

interface MigrationStats {
  employers: { total: number; success: number; failed: number };
  jobs: { total: number; success: number; failed: number };
  candidates: { total: number; success: number; failed: number };
}

const stats: MigrationStats = {
  employers: { total: 0, success: 0, failed: 0 },
  jobs: { total: 0, success: 0, failed: 0 },
  candidates: { total: 0, success: 0, failed: 0 },
};

// Map to store employer email -> Firebase UID
const employerMap = new Map<string, string>();

// Common MySmartJobBoard column mappings (adjust based on your export)
const COLUMN_MAPPINGS = {
  // Employer columns - updated for SmartJobBoard CSV export format
  employer: {
    id: ["Employer Id", "employer_id", "EmployerId", "id"],
    email: ["Employer Email", "email", "Email", "company_email", "CompanyEmail"],
    fullName: ["Full Name", "full_name", "FullName", "contact_name"],
    name: ["Company Name", "company_name", "CompanyName", "name", "Name", "organization"],
    description: ["Company Description", "description", "Description", "about", "About"],
    website: ["Employer Website", "website", "Website", "url", "URL"],
    phone: ["Employer Phone", "phone", "Phone"],
    location: ["Location", "location", "address"],
    city: ["City", "city"],
    state: ["State", "state", "province", "Province"],
    country: ["Country", "country"],
    zipCode: ["Zip Code", "zip_code", "ZipCode", "postal_code"],
    logo: ["Employer Logo", "logo", "Logo", "logo_url", "LogoURL"],
    status: ["Status", "status"],
    registrationDate: ["Registration Date", "registration_date", "created_at"],
  },
  // Job columns
  job: {
    title: ["title", "Title", "job_title", "JobTitle", "position"],
    description: ["description", "Description", "job_description"],
    location: ["location", "Location", "city", "City"],
    employmentType: ["employment_type", "EmploymentType", "job_type", "JobType", "type"],
    salary: ["salary", "Salary", "salary_range", "SalaryRange"],
    closingDate: ["closing_date", "ClosingDate", "expires", "Expires", "deadline"],
    company: ["company", "Company", "employer", "Employer", "company_name"],
    remote: ["remote", "Remote", "is_remote", "IsRemote"],
    applyUrl: ["apply_url", "ApplyURL", "application_url", "ApplicationURL"],
    applyEmail: ["apply_email", "ApplyEmail", "application_email"],
  },
  // Candidate/Jobseeker columns - SmartJobBoard export format
  candidate: {
    id: ["Job Seeker Id", "job_seeker_id", "JobSeekerId", "id"],
    email: ["Email", "email"],
    name: ["Full Name", "full_name", "FullName", "name", "Name"],
    hasResume: ["Has Resume", "has_resume", "HasResume"],
    registrationDate: ["Registration Date", "registration_date", "RegistrationDate", "created_at"],
    status: ["Status", "status"],
    newsletterConsent: ["Newsletter Consent", "newsletter_consent", "NewsletterConsent"],
    location: ["location", "Location", "city"],
    skills: ["skills", "Skills"],
    resume: ["resume", "Resume", "resume_url", "ResumeURL"],
  },
};

function getColumnValue(row: Record<string, string>, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

// ============================================
// Import Functions
// ============================================

async function importEmployers(filePath: string): Promise<void> {
  console.log("\n📦 Importing Employers...\n");

  if (!fs.existsSync(filePath)) {
    console.log("   ⚠️  No employers.csv found, skipping...");
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  stats.employers.total = rows.length;

  console.log(`   Found ${rows.length} employers to import\n`);

  for (const row of rows) {
    const email = getColumnValue(row, COLUMN_MAPPINGS.employer.email);
    const name = getColumnValue(row, COLUMN_MAPPINGS.employer.name);
    const fullName = getColumnValue(row, COLUMN_MAPPINGS.employer.fullName);
    const originalId = getColumnValue(row, COLUMN_MAPPINGS.employer.id);

    if (!email || !name) {
      console.log(`   ⚠️  Skipping employer with missing email/name`);
      stats.employers.failed++;
      continue;
    }

    try {
      // Check if user already exists in Firebase Auth
      let userId: string;
      try {
        const existingUser = await auth.getUserByEmail(email);
        userId = existingUser.uid;
        console.log(`   ✓ Employer exists: ${name} (${email})`);
      } catch {
        // Create new user
        const newUser = await auth.createUser({
          email,
          displayName: fullName || name,
          password: generateTempPassword(), // They'll need to reset
        });
        userId = newUser.uid;
        console.log(`   + Created employer: ${name} (${email})`);
      }

      // Store mapping for job import
      employerMap.set(email.toLowerCase(), userId);
      employerMap.set(name.toLowerCase(), userId);
      if (originalId) {
        employerMap.set(originalId, userId);
      }

      // Build location string from components
      const locationParts = [
        getColumnValue(row, COLUMN_MAPPINGS.employer.city),
        getColumnValue(row, COLUMN_MAPPINGS.employer.state),
        getColumnValue(row, COLUMN_MAPPINGS.employer.country),
      ].filter(Boolean);
      const fullLocation = getColumnValue(row, COLUMN_MAPPINGS.employer.location) || locationParts.join(", ");

      // Map status: "Active" -> "approved", others -> "pending"
      const csvStatus = getColumnValue(row, COLUMN_MAPPINGS.employer.status);
      const status = csvStatus.toLowerCase() === "active" ? "approved" : "pending";

      // Strip HTML from description
      let description = getColumnValue(row, COLUMN_MAPPINGS.employer.description) || "";
      description = description.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

      // Create/update user document
      await db.collection("users").doc(userId).set({
        email,
        displayName: fullName || name,
        role: "employer",
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Create/update employer profile in the "employers" collection
      await db.collection("employers").doc(userId).set({
        id: userId,
        userId,
        organizationName: name,
        description: description || null,
        website: getColumnValue(row, COLUMN_MAPPINGS.employer.website) || null,
        location: fullLocation || null,
        logoUrl: getColumnValue(row, COLUMN_MAPPINGS.employer.logo) || null,
        status,
        approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // Store original SmartJobBoard ID for reference
        smartJobBoardId: originalId || null,
      }, { merge: true });

      stats.employers.success++;
    } catch (error: unknown) {
      console.log(`   ❌ Failed: ${name} - ${error instanceof Error ? error.message : error}`);
      stats.employers.failed++;
    }
  }
}

async function importJobs(filePath: string): Promise<void> {
  console.log("\n💼 Importing Jobs...\n");

  if (!fs.existsSync(filePath)) {
    console.log("   ⚠️  No jobs.csv found, skipping...");
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  stats.jobs.total = rows.length;

  console.log(`   Found ${rows.length} jobs to import\n`);

  for (const row of rows) {
    const title = getColumnValue(row, COLUMN_MAPPINGS.job.title);
    const company = getColumnValue(row, COLUMN_MAPPINGS.job.company);

    if (!title) {
      console.log(`   ⚠️  Skipping job with no title`);
      stats.jobs.failed++;
      continue;
    }

    try {
      // Find employer ID
      let employerId = employerMap.get(company.toLowerCase());

      // If no employer found, create a placeholder
      if (!employerId) {
        console.log(`   ⚠️  No employer match for "${company}", using placeholder`);
        employerId = "imported-employer";
      }

      // Parse closing date
      let closingDate = null;
      const closingDateStr = getColumnValue(row, COLUMN_MAPPINGS.job.closingDate);
      if (closingDateStr) {
        const parsed = new Date(closingDateStr);
        if (!isNaN(parsed.getTime())) {
          closingDate = parsed;
        }
      }

      // Parse employment type
      let employmentType = getColumnValue(row, COLUMN_MAPPINGS.job.employmentType) || "Full-time";
      employmentType = normalizeEmploymentType(employmentType);

      // Check if remote
      const remoteStr = getColumnValue(row, COLUMN_MAPPINGS.job.remote).toLowerCase();
      const remoteFlag = ["yes", "true", "1", "remote"].includes(remoteStr);

      // Create job document
      const jobData = {
        employerId,
        employerName: company || "Imported Employer",
        title,
        description: getColumnValue(row, COLUMN_MAPPINGS.job.description) || "",
        location: getColumnValue(row, COLUMN_MAPPINGS.job.location) || "Canada",
        employmentType,
        remoteFlag,
        salaryRange: getColumnValue(row, COLUMN_MAPPINGS.job.salary) || null,
        applicationLink: getColumnValue(row, COLUMN_MAPPINGS.job.applyUrl) || null,
        applicationEmail: getColumnValue(row, COLUMN_MAPPINGS.job.applyEmail) || null,
        closingDate: closingDate ? closingDate : null,
        active: true,
        quickApplyEnabled: false,
        viewsCount: 0,
        applicationsCount: 0,
        source: "smartjobboard-import",
        createdAt: FieldValue.serverTimestamp(),
      };

      await db.collection("jobs").add(jobData);
      console.log(`   ✓ Imported: ${title} at ${company}`);
      stats.jobs.success++;
    } catch (error: unknown) {
      console.log(`   ❌ Failed: ${title} - ${error instanceof Error ? error.message : error}`);
      stats.jobs.failed++;
    }
  }
}

async function importCandidates(filePath: string, altFilePath?: string): Promise<void> {
  console.log("\n👤 Importing Job Seekers/Candidates...\n");

  // Try primary path first, then alternate
  let actualPath = filePath;
  if (!fs.existsSync(filePath)) {
    if (altFilePath && fs.existsSync(altFilePath)) {
      actualPath = altFilePath;
      console.log(`   Using ${path.basename(altFilePath)} instead of candidates.csv`);
    } else {
      console.log("   ⚠️  No candidates.csv or jobseekers.csv found, skipping...");
      return;
    }
  }

  const content = fs.readFileSync(actualPath, "utf-8");
  const rows = parseCSV(content);
  stats.candidates.total = rows.length;

  console.log(`   Found ${rows.length} job seekers to import\n`);

  let skippedInactive = 0;

  for (const row of rows) {
    const email = getColumnValue(row, COLUMN_MAPPINGS.candidate.email);
    const name = getColumnValue(row, COLUMN_MAPPINGS.candidate.name);
    const originalId = getColumnValue(row, COLUMN_MAPPINGS.candidate.id);
    const status = getColumnValue(row, COLUMN_MAPPINGS.candidate.status);
    const hasResume = getColumnValue(row, COLUMN_MAPPINGS.candidate.hasResume);

    if (!email) {
      console.log(`   ⚠️  Skipping candidate with no email`);
      stats.candidates.failed++;
      continue;
    }

    // Skip inactive users
    if (status.toLowerCase() === "not active") {
      skippedInactive++;
      continue;
    }

    try {
      // Check if user already exists
      let userId: string;
      let isNewUser = false;
      try {
        const existingUser = await auth.getUserByEmail(email);
        userId = existingUser.uid;
        console.log(`   ✓ User exists: ${name || email}`);
      } catch {
        // Create new user
        const newUser = await auth.createUser({
          email,
          displayName: name || email.split("@")[0],
          password: generateTempPassword(),
        });
        userId = newUser.uid;
        isNewUser = true;
        console.log(`   + Created: ${name || email}`);
      }

      // Create/update user document
      if (isNewUser) {
        // New user - set all fields including role
        await db.collection("users").doc(userId).set({
          email,
          displayName: name || email.split("@")[0],
          role: "member", // Default to community member
          createdAt: FieldValue.serverTimestamp(),
          smartJobBoardId: originalId || null,
        }, { merge: true });
      } else {
        // Existing user - only add smartJobBoardId, preserve their existing role
        await db.collection("users").doc(userId).update({
          smartJobBoardId: originalId || null,
        });
      }

      // Create/update member profile
      const skills = getColumnValue(row, COLUMN_MAPPINGS.candidate.skills);
      await db.collection("memberProfiles").doc(userId).set({
        userId,
        displayName: name || email.split("@")[0],
        location: getColumnValue(row, COLUMN_MAPPINGS.candidate.location) || null,
        skills: skills ? skills.split(",").map(s => s.trim()) : [],
        resumeUrl: getColumnValue(row, COLUMN_MAPPINGS.candidate.resume) || null,
        // Note if they had a resume in the old system
        hadResumeInSmartJobBoard: hasResume.toLowerCase() === "yes",
        smartJobBoardId: originalId || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      stats.candidates.success++;
    } catch (error: unknown) {
      console.log(`   ❌ Failed: ${email} - ${error instanceof Error ? error.message : error}`);
      stats.candidates.failed++;
    }
  }

  if (skippedInactive > 0) {
    console.log(`\n   ℹ️  Skipped ${skippedInactive} inactive users`);
  }
}

// ============================================
// Helpers
// ============================================

function generateTempPassword(): string {
  return "TempPass" + Math.random().toString(36).substring(2, 10) + "!";
}

function normalizeEmploymentType(type: string): string {
  const normalized = type.toLowerCase().trim();

  if (normalized.includes("full")) return "Full-time";
  if (normalized.includes("part")) return "Part-time";
  if (normalized.includes("contract")) return "Contract";
  if (normalized.includes("temp")) return "Temporary";
  if (normalized.includes("intern")) return "Internship";
  if (normalized.includes("freelance")) return "Freelance";

  return "Full-time";
}

// ============================================
// Main
// ============================================

async function main() {
  console.log("\n========================================");
  console.log("  MYSMARTJOBBOARD → IOPPS MIGRATION");
  console.log("========================================\n");

  const dataDir = path.join(__dirname, "migration-data");

  // Check if migration data folder exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created migration-data folder at:`);
    console.log(`   ${dataDir}\n`);
    console.log("Please add your CSV exports from MySmartJobBoard:");
    console.log("   - employers.csv");
    console.log("   - jobs.csv");
    console.log("   - candidates.csv (optional)\n");
    console.log("Then run this script again.\n");
    process.exit(0);
  }

  // Check for CSV files
  const employersFile = path.join(dataDir, "employers.csv");
  const jobsFile = path.join(dataDir, "jobs.csv");
  const candidatesFile = path.join(dataDir, "candidates.csv");
  const jobseekersFile = path.join(dataDir, "jobseekers.csv");

  const hasFiles = fs.existsSync(employersFile) || fs.existsSync(jobsFile) ||
                   fs.existsSync(candidatesFile) || fs.existsSync(jobseekersFile);

  if (!hasFiles) {
    console.log("❌ No CSV files found in migration-data folder.\n");
    console.log("Export from SmartJobBoard admin panel and add:");
    console.log(`   ${employersFile}`);
    console.log(`   ${jobsFile}`);
    console.log(`   ${jobseekersFile} (or candidates.csv)\n`);
    process.exit(1);
  }

  // Run imports in order
  await importEmployers(employersFile);
  await importJobs(jobsFile);
  await importCandidates(candidatesFile, jobseekersFile);

  // Print summary
  console.log("\n========================================");
  console.log("  MIGRATION COMPLETE");
  console.log("========================================\n");

  console.log("  Employers:");
  console.log(`    Total:   ${stats.employers.total}`);
  console.log(`    Success: ${stats.employers.success}`);
  console.log(`    Failed:  ${stats.employers.failed}`);

  console.log("\n  Jobs:");
  console.log(`    Total:   ${stats.jobs.total}`);
  console.log(`    Success: ${stats.jobs.success}`);
  console.log(`    Failed:  ${stats.jobs.failed}`);

  console.log("\n  Job Seekers:");
  console.log(`    Total:   ${stats.candidates.total}`);
  console.log(`    Success: ${stats.candidates.success}`);
  console.log(`    Failed:  ${stats.candidates.failed}`);

  console.log("\n⚠️  IMPORTANT: Users were created with temporary passwords.");
  console.log("   They will need to use 'Forgot Password' to set their own.\n");
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
