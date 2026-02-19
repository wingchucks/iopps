#!/usr/bin/env node
/**
 * Bulk Delete Firebase Auth Users by Creation Date
 *
 * Identifies and optionally deletes Firebase Auth users created on a specific date
 * (Dec 11, 2025 in America/Regina timezone by default).
 *
 * SAFETY: Default mode is DRY_RUN=true (no deletions).
 *
 * Usage:
 *   DRY_RUN=true node scripts/bulk_delete_users_by_date.js
 *   DRY_RUN=false node scripts/bulk_delete_users_by_date.js
 *
 * Environment Variables:
 *   DRY_RUN               - "true" (default) or "false"
 *   PROFILE_COLLECTION    - Firestore collection name (default: "memberProfiles")
 *   DELETE_SUBCOLLECTIONS - "true" to delete subcollections (default: "false")
 *
 * Authentication (one of):
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON file
 *   FIREBASE_SERVICE_ACCOUNT_BASE64 - Base64-encoded service account JSON
 *   FIREBASE_SERVICE_ACCOUNT_JSON   - Raw service account JSON string
 *   Or individual: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default: true (safe)
const PROFILE_COLLECTION = process.env.PROFILE_COLLECTION || 'memberProfiles';
const DELETE_SUBCOLLECTIONS = process.env.DELETE_SUBCOLLECTIONS === 'true';
const BATCH_SIZE = 1000; // Firebase deleteUsers limit

// Target date: Dec 11, 2025 in America/Regina timezone (CST, UTC-6, no DST)
// Dec 11, 2025 00:00:00 CST = Dec 11, 2025 06:00:00 UTC
// Dec 12, 2025 00:00:00 CST = Dec 12, 2025 06:00:00 UTC
const TARGET_START_UTC = new Date('2025-12-11T06:00:00.000Z');
const TARGET_END_UTC = new Date('2025-12-12T06:00:00.000Z');

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'output');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return { auth: admin.auth(), db: admin.firestore() };
  }

  let credential;

  // Method 1: GOOGLE_APPLICATION_CREDENTIALS (service account file path)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using GOOGLE_APPLICATION_CREDENTIALS for authentication');
    credential = admin.credential.applicationDefault();
  }
  // Method 2: Base64-encoded service account JSON
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log('Using FIREBASE_SERVICE_ACCOUNT_BASE64 for authentication');
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded);
    credential = admin.credential.cert(serviceAccount);
  }
  // Method 3: Raw JSON service account
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log('Using FIREBASE_SERVICE_ACCOUNT_JSON for authentication');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  }
  // Method 4: Individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('Using individual Firebase env vars for authentication');
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  // Method 5: gcloud application-default credentials
  else {
    console.log('Attempting gcloud application-default credentials');
    try {
      credential = admin.credential.applicationDefault();
    } catch (err) {
      throw new Error(
        'No Firebase credentials found. Set one of:\n' +
        '  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)\n' +
        '  - FIREBASE_SERVICE_ACCOUNT_BASE64\n' +
        '  - FIREBASE_SERVICE_ACCOUNT_JSON\n' +
        '  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
        '  - Run: gcloud auth application-default login'
      );
    }
  }

  admin.initializeApp({ credential });
  return { auth: admin.auth(), db: admin.firestore() };
}

// ============================================================================
// USER DISCOVERY
// ============================================================================

async function listAllUsers(auth) {
  const users = [];
  let nextPageToken;

  console.log('\nFetching all Firebase Auth users...');

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users.push(...result.users);
    nextPageToken = result.pageToken;
    process.stdout.write(`  Fetched ${users.length} users...\r`);
  } while (nextPageToken);

  console.log(`  Total users in Firebase Auth: ${users.length}`);
  return users;
}

function filterUsersByDateRange(users, startUtc, endUtc) {
  return users.filter(user => {
    if (!user.metadata.creationTime) return false;
    const createdAt = new Date(user.metadata.creationTime);
    return createdAt >= startUtc && createdAt < endUtc;
  });
}

// ============================================================================
// CSV OUTPUT
// ============================================================================

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function writeUsersCsv(users, filename) {
  ensureOutputDir();
  const filepath = path.join(OUTPUT_DIR, filename);

  const header = 'uid,email,creationTimeUTC,lastSignInTimeUTC,disabled';
  const rows = users.map(u => {
    const email = (u.email || '').replace(/,/g, ';'); // Escape commas
    const created = u.metadata.creationTime || '';
    const lastSignIn = u.metadata.lastSignInTime || '';
    return `${u.uid},${email},${created},${lastSignIn},${u.disabled}`;
  });

  fs.writeFileSync(filepath, [header, ...rows].join('\n'), 'utf8');
  return filepath;
}

function writeFirestoreCsv(results, filename) {
  ensureOutputDir();
  const filepath = path.join(OUTPUT_DIR, filename);

  const header = 'uid,firestoreProfileExists,deletedProfileDoc,errorIfAny';
  const rows = results.map(r => {
    const error = (r.error || '').replace(/,/g, ';').replace(/\n/g, ' ');
    return `${r.uid},${r.exists},${r.deleted},${error}`;
  });

  fs.writeFileSync(filepath, [header, ...rows].join('\n'), 'utf8');
  return filepath;
}

// ============================================================================
// DELETION OPERATIONS
// ============================================================================

async function deleteAuthUsersBatch(auth, uids) {
  const results = { success: 0, failed: 0, errors: [] };

  // Firebase allows max 1000 users per deleteUsers call
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);
    console.log(`  Deleting Auth users ${i + 1}-${Math.min(i + BATCH_SIZE, uids.length)} of ${uids.length}...`);

    try {
      const deleteResult = await auth.deleteUsers(batch);
      results.success += deleteResult.successCount;
      results.failed += deleteResult.failureCount;

      if (deleteResult.errors && deleteResult.errors.length > 0) {
        deleteResult.errors.forEach(err => {
          results.errors.push({ uid: batch[err.index], error: err.error.message });
        });
      }
    } catch (err) {
      console.error(`  Batch deletion error: ${err.message}`);
      results.failed += batch.length;
      batch.forEach(uid => results.errors.push({ uid, error: err.message }));
    }
  }

  return results;
}

async function checkAndDeleteFirestoreDocs(db, uids, collection, actuallyDelete) {
  const results = [];

  console.log(`\n${actuallyDelete ? 'Deleting' : 'Checking'} Firestore docs in "${collection}" collection...`);

  for (let i = 0; i < uids.length; i++) {
    const uid = uids[i];
    const docRef = db.collection(collection).doc(uid);

    try {
      const doc = await docRef.get();
      const exists = doc.exists;
      let deleted = false;

      if (exists && actuallyDelete) {
        await docRef.delete();
        deleted = true;
      }

      results.push({ uid, exists, deleted, error: null });

      if ((i + 1) % 100 === 0 || i === uids.length - 1) {
        process.stdout.write(`  Processed ${i + 1}/${uids.length} docs...\r`);
      }
    } catch (err) {
      results.push({ uid, exists: 'unknown', deleted: false, error: err.message });
    }
  }

  console.log(`  Completed Firestore check/delete for ${uids.length} docs`);
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('BULK DELETE FIREBASE AUTH USERS BY CREATION DATE');
  console.log('='.repeat(70));
  console.log(`\nMode: ${DRY_RUN ? 'DRY RUN (no deletions)' : '*** LIVE DELETE MODE ***'}`);
  console.log(`Profile Collection: ${PROFILE_COLLECTION}`);
  console.log(`Delete Subcollections: ${DELETE_SUBCOLLECTIONS}`);
  console.log(`\nTarget Date Window (America/Regina CST):`);
  console.log(`  Start: Dec 11, 2025 00:00:00 CST`);
  console.log(`  End:   Dec 12, 2025 00:00:00 CST`);
  console.log(`\nConverted to UTC:`);
  console.log(`  Start: ${TARGET_START_UTC.toISOString()}`);
  console.log(`  End:   ${TARGET_END_UTC.toISOString()}`);

  // Initialize Firebase
  const { auth, db } = initializeFirebase();

  // List and filter users
  const allUsers = await listAllUsers(auth);
  const targetUsers = filterUsersByDateRange(allUsers, TARGET_START_UTC, TARGET_END_UTC);

  console.log(`\nUsers created on Dec 11, 2025 (America/Regina): ${targetUsers.length}`);

  if (targetUsers.length === 0) {
    console.log('\nNo users found matching criteria. Exiting.');
    return;
  }

  // Write candidates CSV
  const usersCsvFilename = `candidates_${TIMESTAMP}.csv`;
  const usersCsvPath = writeUsersCsv(targetUsers, usersCsvFilename);
  console.log(`\nCandidates CSV written: ${usersCsvPath}`);

  // Extract UIDs
  const uids = targetUsers.map(u => u.uid);

  // Check/Delete Firestore docs
  const firestoreResults = await checkAndDeleteFirestoreDocs(
    db,
    uids,
    PROFILE_COLLECTION,
    !DRY_RUN
  );

  // Write Firestore CSV
  const firestoreCsvFilename = `firestore_${TIMESTAMP}.csv`;
  const firestoreCsvPath = writeFirestoreCsv(firestoreResults, firestoreCsvFilename);
  console.log(`Firestore CSV written: ${firestoreCsvPath}`);

  // Auth deletion (only if not dry run)
  let authResults = { success: 0, failed: 0, errors: [] };

  if (!DRY_RUN) {
    console.log('\n*** DELETING AUTH USERS ***');
    authResults = await deleteAuthUsersBatch(auth, uids);
  } else {
    console.log('\n[DRY RUN] Skipping Auth user deletion');
    authResults.success = 0;
    authResults.failed = 0;
  }

  // Final Report
  const firestoreExists = firestoreResults.filter(r => r.exists === true).length;
  const firestoreDeleted = firestoreResults.filter(r => r.deleted === true).length;
  const firestoreErrors = firestoreResults.filter(r => r.error !== null).length;

  console.log('\n' + '='.repeat(70));
  console.log('FINAL REPORT');
  console.log('='.repeat(70));
  console.log(`\nMode: ${DRY_RUN ? 'DRY RUN' : 'LIVE DELETE'}`);
  console.log(`\nTotal candidates found: ${targetUsers.length}`);
  console.log(`\nFirebase Auth:`);
  console.log(`  - Would delete: ${uids.length}`);
  console.log(`  - Actually deleted: ${authResults.success}`);
  console.log(`  - Failed: ${authResults.failed}`);
  console.log(`\nFirestore (${PROFILE_COLLECTION}):`);
  console.log(`  - Profiles found: ${firestoreExists}`);
  console.log(`  - Profiles deleted: ${firestoreDeleted}`);
  console.log(`  - Errors: ${firestoreErrors}`);
  console.log(`\nOutput files:`);
  console.log(`  - ${usersCsvPath}`);
  console.log(`  - ${firestoreCsvPath}`);

  if (DRY_RUN) {
    console.log('\n' + '-'.repeat(70));
    console.log('TO EXECUTE ACTUAL DELETION, run with DRY_RUN=false');
    console.log('-'.repeat(70));
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
