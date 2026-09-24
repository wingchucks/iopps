/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script, require() is idiomatic here */
/**
 * Offline duplicate-job cleanup for the `jobs` collection.
 *
 * ⚠️  REQUIRES HUMAN APPROVAL BEFORE RUNNING AGAINST PRODUCTION. ⚠️
 *
 * This script NEVER runs against a database by accident:
 *   - Default mode is a read-only DRY RUN that only reports what it would do.
 *   - --apply performs writes ONLY when --project <id> explicitly names the
 *     target Firebase project, so a human has to confirm the destination.
 *
 * What it does:
 *   1. Groups job docs by the import fingerprint
 *      (normalized title + employer/org + location — byte-identical to
 *      jobFingerprint() in src/lib/server/feed-import-identity.ts).
 *   2. DRY RUN: prints every fingerprint group with >1 live doc.
 *   3. --apply: keeps one canonical doc per group and soft-deletes the rest
 *      (status "deleted", active false, duplicateOf -> canonical id).
 *      Soft-deleted / already-marked docs are skipped, so re-runs are idempotent.
 *   4. --apply also backfills `importFingerprint` on legacy docs that lack it,
 *      so the import-time guard (fingerprintDuplicateExists) covers them.
 *   5. --report-quality: lists docs whose description/location still carry
 *      known import artifacts (for HUMAN review — nothing is auto-rewritten,
 *      per the repo's never-invent-meaning editorial policy).
 *
 * Usage:
 *   node scripts/dedupe-imported-jobs.js [--limit N] [--report-quality]
 *   node scripts/dedupe-imported-jobs.js --apply --project <firebase-project-id> [--limit N]
 */

const admin = require('firebase-admin');
const { createHash } = require('node:crypto');
const { existsSync } = require('node:fs');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REPORT_QUALITY = args.includes('--report-quality');
const projectFlag = args[args.indexOf('--project') + 1];
const limitFlag = Number(args[args.indexOf('--limit') + 1]) || 0;

function getCredentials() {
  const base64Str = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Str) {
    try {
      const parsed = JSON.parse(Buffer.from(base64Str, 'base64').toString('utf-8'));
      return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key };
    } catch {
      throw new Error('Invalid Firebase credential configuration.');
    }
  }
  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

// Byte-identical to jobFingerprint() in src/lib/server/feed-import-identity.ts.
function fingerprintOf(title, employer, location) {
  const norm = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = [norm(title), norm(employer), norm(location)];
  if (parts.some((part) => !part) || ['unknown', 'n a', 'na', 'none', 'tbd'].includes(parts[1])) return null;
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

const QUALITY_PATTERNS = [
  ['artifact:Originally-posted', /originally posted\s*:/i, ['description', 'title']],
  ['artifact:broken-hyphen-spacing', /\d-\s+[A-Za-z]/, ['description', 'title']],
  ['artifact:concatenated-post-tag', /post(?:scholarships|events)/i, ['description', 'title']],
  ['artifact:ampersand-without-spaces', /[A-Za-z]{2,}&[A-Za-z]{2,}|[A-Za-z]{2,}&(?= [A-Za-z])/, ['description', 'title']],
  ['artifact:camelcase-boundary', /[a-z][A-Z]/, ['description', 'title']],
  ['artifact:replacement-character', /�/, ['description', 'title', 'location']],
];

function locationHasDuplicateSegments(location) {
  const segments = String(location || '').split(/\s*[,;|]\s*/).map((s) => s.toLowerCase()).filter(Boolean);
  if (new Set(segments).size !== segments.length) return true;
  return /\b([\p{L}\p{N}']+)(?:\s+\1)+\b/iu.test(String(location || ''));
}

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const creds = getCredentials();
  if (!creds.projectId || !creds.clientEmail || !creds.privateKey) {
    console.error('Missing Firebase credentials. Configure .env.local first.');
    process.exit(1);
  }
  if (APPLY && projectFlag !== creds.projectId) {
    console.error('Refusing to apply: pass --project <id> naming the target Firebase project explicitly.');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(creds) });
  const db = admin.firestore();

  console.log(APPLY
    ? '⚠️  APPLY MODE. The explicit project matches the configured credentials. Writes WILL happen.'
    : 'DRY RUN — no writes. Pass --apply --project <id> to perform cleanup after human approval.');

  const groups = new Map(); // fingerprint -> docs
  const qualityHits = new Map(); // pattern name -> [{id, title}]
  let locationDupes = [];
  let scanned = 0;
  let backfilled = 0;
  const batch = APPLY ? db.batch() : null;
  let batchedWrites = 0;
  const commitBatch = async () => { if (batch && batchedWrites) { await batch.commit(); batchedWrites = 0; } };

  const queueWrite = (ref, data) => {
    batch.update(ref, data);
    batchedWrites += 1;
    if (batchedWrites >= 400) return commitBatch();
    return Promise.resolve();
  };

  let query = db.collection('jobs').orderBy(admin.firestore.FieldPath.documentId()).limit(500);
  for (;;) {
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      scanned += 1;
      if (limitFlag && scanned > limitFlag) break;
      const data = doc.data();
      if (data.duplicateOf || data.status === 'deleted') continue; // already handled: idempotent skip
      const fingerprint = data.importFingerprint
        || fingerprintOf(data.title, data.employerName || data.company || data.organization, data.location);
      if (!fingerprint) continue;
      if (APPLY && !data.importFingerprint) {
        await queueWrite(doc.ref, { importFingerprint: fingerprint });
        backfilled += 1;
      }
      if (!groups.has(fingerprint)) groups.set(fingerprint, []);
      groups.get(fingerprint).push({ id: doc.id, ref: doc.ref, ...data });
      if (REPORT_QUALITY) {
        for (const [name, pattern, fields] of QUALITY_PATTERNS) {
          if (fields.some((field) => pattern.test(String(data[field] || '')))) {
            if (!qualityHits.has(name)) qualityHits.set(name, []);
            if (qualityHits.get(name).length < 5) qualityHits.get(name).push({ id: doc.id, title: data.title });
          }
        }
        if (locationHasDuplicateSegments(data.location)) locationDupes.push({ id: doc.id, location: data.location });
      }
    }
    if (limitFlag && scanned > limitFlag) break;
    const last = snap.docs[snap.docs.length - 1];
    query = db.collection('jobs').orderBy(admin.firestore.FieldPath.documentId()).startAfter(last.id).limit(500);
  }

  const duplicateGroups = [...groups.values()].filter((docs) => docs.length > 1);
  console.log(`\nScanned ${scanned} job docs. ${duplicateGroups.length} fingerprint groups contain duplicates.`);

  const pickCanonical = (docs) => [...docs].sort((a, b) => {
    const score = (d) => [
      d.importIdentity ? 0 : 1,                       // guarded import record wins
      d.active === false || d.status === 'deleted' ? 1 : 0,
      -(String(d.description || '').length),          // most complete description
    ];
    for (let i = 0; i < 3; i += 1) {
      const diff = score(a)[i] - score(b)[i];
      if (diff) return diff;
    }
    return String(a.createdAt || '') < String(b.createdAt || '') ? -1 : 1; // earliest wins ties
  })[0];

  let marked = 0;
  for (const docs of duplicateGroups) {
    const canonical = pickCanonical(docs);
    console.log(`\nDuplicate group (fingerprint ${docs[0].importFingerprint || 'computed'}):`);
    for (const doc of docs) {
      const marker = doc.id === canonical.id ? '  KEEP ' : '  DUP  ';
      console.log(`${marker} ${doc.id} | ${doc.title} | ${doc.employerName || doc.company || '?'} | ${doc.location} | feed=${doc.feedId || '?'} | source=${doc.source || '?'}`);
    }
    if (APPLY) {
      const stamp = { status: 'deleted', active: false, duplicateOf: canonical.id, dedupedAt: admin.firestore.FieldValue.serverTimestamp(), dedupeReason: 'import-fingerprint-duplicate' };
      for (const doc of docs) {
        if (doc.id === canonical.id) continue;
        await queueWrite(doc.ref, stamp);
        const mirror = await db.collection('posts').doc(doc.id).get();
        if (mirror.exists && !mirror.get('duplicateOf')) await queueWrite(mirror.ref, stamp);
        marked += 1;
      }
    }
  }
  await commitBatch();

  if (REPORT_QUALITY) {
    console.log('\n--- Import-artifact report (HUMAN REVIEW ONLY — nothing auto-rewritten) ---');
    for (const [name, hits] of qualityHits) {
      console.log(`${name}: ${hits.length}+ docs, e.g. ${hits.map((h) => `${h.id} ("${String(h.title).slice(0, 60)}")`).join('; ')}`);
    }
    console.log(`artifact:duplicated-location: ${locationDupes.length} docs${locationDupes.slice(0, 5).map((d) => ` ${d.id} ("${d.location}")`).join(';')}`);
  }

  console.log(`\nDone. ${APPLY ? `Soft-deleted ${marked} duplicate docs; backfilled importFingerprint on ${backfilled} docs.` : 'No writes performed (dry run).'}`);
  process.exit(0);
}

// SDK and parsing errors can embed credential values. Never print raw errors.
main().catch(() => { console.error('Cleanup failed. Check configuration and access without sharing credential values.'); process.exit(1); });
