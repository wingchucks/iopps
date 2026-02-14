/**
 * Diagnostic script to check employer document status
 * Run: node scripts/diagnose-employer.js <slug>
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables from root .env.local (where Firebase Admin credentials are stored)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Helper to parse the private key from various formats
function parsePrivateKey(key) {
  if (!key) return null;

  let parsedKey = key.trim();

  // Remove surrounding quotes if present
  if ((parsedKey.startsWith('"') && parsedKey.endsWith('"')) ||
      (parsedKey.startsWith("'") && parsedKey.endsWith("'")) ||
      (parsedKey.startsWith('`') && parsedKey.endsWith('`'))) {
    parsedKey = parsedKey.slice(1, -1);
  }

  // Handle escaped newlines
  parsedKey = parsedKey.replace(/\\\\n/g, "\\n");
  parsedKey = parsedKey.replace(/\\n/g, "\n");
  parsedKey = parsedKey.replace(/\r\n/g, "\n");

  // Try to decode from base64 if it doesn't look like a PEM key
  if (!parsedKey.includes("-----BEGIN")) {
    try {
      const decoded = Buffer.from(parsedKey, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        parsedKey = decoded;
      }
    } catch {
      // Not base64, continue with original
    }
  }

  return parsedKey;
}

// Try to parse service account from JSON string
function tryParseServiceAccountJson() {
  // Try base64-encoded version first
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
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", e.message);
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
function initializeFirebase() {
  const serviceAccount = tryParseServiceAccountJson();

  const projectId = serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = serviceAccount?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = serviceAccount?.privateKey || parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    console.error(`ERROR: Missing Firebase credentials: ${missing.join(", ")}`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return admin.firestore();
}

async function diagnoseEmployer(slug) {
  console.log(`\n🔍 Diagnosing employer with slug: "${slug}"\n`);
  console.log('='.repeat(60));

  const db = initializeFirebase();

  try {
    // Query by slug
    const snapshot = await db
      .collection('employers')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('\n❌ RESULT: No document found with this slug\n');
      console.log('Possible causes:');
      console.log('  - The document was deleted');
      console.log('  - The slug was changed');
      console.log('  - Typo in the slug');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('\n✅ Document found!\n');
    console.log('Document ID:', doc.id);
    console.log('Organization:', data.organizationName || '(not set)');
    console.log('Slug:', data.slug);
    console.log('');
    console.log('--- KEY FIELDS FOR PUBLIC VISIBILITY ---');
    console.log('status:', data.status || '(not set)');
    console.log('publicationStatus:', data.publicationStatus || '(not set)');
    console.log('directoryVisible:', data.directoryVisible);
    console.log('deletedAt:', data.deletedAt ? data.deletedAt.toDate() : '(not set)');
    console.log('');
    console.log('--- TIMESTAMPS ---');
    console.log('createdAt:', data.createdAt ? data.createdAt.toDate() : '(not set)');
    console.log('updatedAt:', data.updatedAt ? data.updatedAt.toDate() : '(not set)');
    console.log('');
    console.log('--- OWNER ---');
    console.log('userId:', data.userId || '(not set)');
    console.log('contactEmail:', data.contactEmail || '(not set)');

    // Diagnosis
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIAGNOSIS:');
    console.log('='.repeat(60));

    const issues = [];

    if (data.deletedAt) {
      issues.push('🔴 Document has been SOFT-DELETED (deletedAt is set)');
    }

    if (data.status !== 'approved') {
      issues.push(`🔴 Status is '${data.status || 'undefined'}' - must be 'approved' for public access`);
    }

    if (data.publicationStatus !== 'PUBLISHED') {
      issues.push(`🔴 Publication status is '${data.publicationStatus || 'undefined'}' - must be 'PUBLISHED' for public access`);
    }

    if (data.directoryVisible === false) {
      issues.push('🟡 Directory visibility is disabled - won\'t appear in directory listings');
    }

    if (issues.length === 0) {
      console.log('\n✅ No issues found - document should be publicly accessible\n');
    } else {
      console.log('');
      issues.forEach(issue => console.log(issue));
      console.log('\n--- RECOMMENDED FIX ---');
      if (data.status !== 'approved') {
        console.log('• Approve the employer in the admin panel at /admin/employers');
      }
      if (data.publicationStatus !== 'PUBLISHED') {
        console.log('• Set publicationStatus to "PUBLISHED" (owner can do this from their dashboard)');
      }
      if (data.deletedAt) {
        console.log('• Remove the deletedAt field to restore the document');
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error querying Firestore:', error.message);
  }

  process.exit(0);
}

// Get slug from command line
const slug = process.argv[2];

if (!slug) {
  console.log('Usage: node scripts/diagnose-employer.js <slug>');
  console.log('Example: node scripts/diagnose-employer.js extra-mile-hauling-and-junk-removal-vhjo');
  process.exit(1);
}

diagnoseEmployer(slug);
