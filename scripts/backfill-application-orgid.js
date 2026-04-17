/**
 * Backfill `orgId` and `employerId` on application documents that are
 * missing them. The new tightened Firestore rule (firestore.rules
 * `applicationBelongsToCallerOrg`) requires one of those fields to resolve
 * which org an application belongs to — any application missing both will
 * be invisible to the employer who should see it.
 *
 * Resolution order per application:
 *   1. If app.orgId and app.employerId are both set, skip.
 *   2. Look up the referenced post via app.postId — first in the `jobs`
 *      collection, then in `posts` (legacy).
 *   3. Copy the post's orgId/employerId (and orgName if missing) onto the
 *      application.
 *   4. If the post itself has no orgId, log and skip — admin should fix by
 *      hand (rare: usually imported RSS jobs).
 *
 * Usage:
 *   node scripts/backfill-application-orgid.js            # dry run
 *   node scripts/backfill-application-orgid.js --apply    # write
 *
 * Credentials: reads FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON from env (pull via
 * `vercel env pull` into .env.prod, then load that file).
 */

const admin = require('firebase-admin');
const fs = require('fs');

const APPLY = process.argv.includes('--apply');
const projectId = 'iopps-c2224';

function initAdmin() {
  if (admin.apps.length) return;
  const envJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      admin.initializeApp({ credential: admin.credential.cert(parsed), projectId });
      return;
    } catch (err) {
      console.error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON:', err);
      process.exit(1);
    }
  }
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gacPath && fs.existsSync(gacPath)) {
    const sa = JSON.parse(fs.readFileSync(gacPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId });
    return;
  }
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
}

async function findPost(db, postId) {
  if (!postId) return null;
  const jobsDoc = await db.collection('jobs').doc(postId).get();
  if (jobsDoc.exists) return { source: 'jobs', data: jobsDoc.data() || {} };
  const postsDoc = await db.collection('posts').doc(postId).get();
  if (postsDoc.exists) return { source: 'posts', data: postsDoc.data() || {} };
  return null;
}

function pickOrgId(data) {
  return (typeof data.orgId === 'string' && data.orgId)
    || (typeof data.employerId === 'string' && data.employerId)
    || '';
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const snap = await db.collection('applications').get();
  console.log(`Inspecting ${snap.size} applications.`);

  let ok = 0;
  let backfilled = 0;
  let unresolved = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const hasOrgId = typeof data.orgId === 'string' && data.orgId.length > 0;
    const hasEmployerId = typeof data.employerId === 'string' && data.employerId.length > 0;

    if (hasOrgId && hasEmployerId) {
      ok += 1;
      continue;
    }

    const post = await findPost(db, data.postId);
    if (!post) {
      console.log(`  [${doc.id}] postId=${data.postId || '∅'}: post not found — orphan application, manual review needed`);
      unresolved += 1;
      continue;
    }

    const postOrgId = pickOrgId(post.data);
    const postEmployerId = (typeof post.data.employerId === 'string' && post.data.employerId) || postOrgId;

    if (!postOrgId) {
      console.log(`  [${doc.id}] post ${post.source}/${data.postId} has no orgId/employerId — manual review needed`);
      unresolved += 1;
      continue;
    }

    const updates = {};
    if (!hasOrgId) updates.orgId = postOrgId;
    if (!hasEmployerId) updates.employerId = postEmployerId;
    if (!data.orgName && typeof post.data.orgName === 'string') {
      updates.orgName = post.data.orgName;
    }

    console.log(`  [${doc.id}] ${data.postTitle || data.postId}: ← orgId=${postOrgId}${!hasEmployerId ? `, employerId=${postEmployerId}` : ''}`);

    if (APPLY) {
      await doc.ref.set(updates, { merge: true });
    }
    backfilled += 1;
  }

  console.log('');
  console.log(`Summary${APPLY ? ' (APPLIED)' : ' (dry run — pass --apply to write)'}:`);
  console.log(`  already ok:   ${ok}`);
  console.log(`  backfilled:   ${backfilled}`);
  console.log(`  unresolved:   ${unresolved}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
