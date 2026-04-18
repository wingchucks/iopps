#!/usr/bin/env node

/**
 * One-off: fill in `orgId` on application docs created before the
 * denormalization change. For each application without `orgId`, look up
 * the linked post in `jobs/{postId}` then `posts/{postId}` and copy over
 * `orgId` (falling back to `employerId` if `orgId` is absent on the post).
 *
 * Usage:
 *   node scripts/backfill-application-orgid.js          # dry-run
 *   node scripts/backfill-application-orgid.js --write  # apply updates
 *
 * Requires `service-account.json` at the repo root with prod Firestore
 * credentials. Safe to re-run; docs that already have `orgId` are skipped.
 */

const admin = require("firebase-admin");
const path = require("path");

const WRITE = process.argv.includes("--write");
const BATCH_SIZE = 400;
const READ_CONCURRENCY = 50;

const serviceAccount = require(path.join(__dirname, "../service-account.json"));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const postCache = new Map();

// Cache in-flight promises (not resolved values) so concurrent callers
// for the same postId share a single RPC instead of racing.
function loadPost(postId) {
  if (!postId) return Promise.resolve(null);
  if (postCache.has(postId)) return postCache.get(postId);
  const promise = (async () => {
    const [jobSnap, postSnap] = await Promise.all([
      db.collection("jobs").doc(postId).get(),
      db.collection("posts").doc(postId).get(),
    ]);
    if (jobSnap.exists) return { source: "jobs", ...jobSnap.data() };
    if (postSnap.exists) return { source: "posts", ...postSnap.data() };
    return null;
  })();
  postCache.set(postId, promise);
  return promise;
}

function resolveOrgId(postData) {
  const fromOrg = typeof postData?.orgId === "string" ? postData.orgId.trim() : "";
  if (fromOrg) return fromOrg;
  const fromEmployer = typeof postData?.employerId === "string" ? postData.employerId.trim() : "";
  return fromEmployer;
}

async function main() {
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY-RUN"}`);
  const snap = await db.collection("applications").get();
  console.log(`Loaded ${snap.size} application docs`);

  const stats = { skipped: 0, resolved: 0, unresolved: 0, wrote: 0 };
  const pending = [];

  for (let i = 0; i < snap.docs.length; i += READ_CONCURRENCY) {
    const chunk = snap.docs.slice(i, i + READ_CONCURRENCY);
    await Promise.all(chunk.map(async (doc) => {
      const data = doc.data();
      if (typeof data.orgId === "string" && data.orgId.trim()) {
        stats.skipped++;
        return;
      }
      const post = await loadPost(data.postId);
      const orgId = post ? resolveOrgId(post) : "";
      if (!orgId) {
        stats.unresolved++;
        console.warn(`  unresolved: app=${doc.id} postId=${data.postId ?? "<missing>"}`);
        return;
      }
      stats.resolved++;
      pending.push({ ref: doc.ref, orgId });
    }));
  }

  console.log(
    `Stats: skipped=${stats.skipped} resolved=${stats.resolved} unresolved=${stats.unresolved}`,
  );

  if (!WRITE) {
    console.log("Dry-run complete. Re-run with --write to apply.");
    return;
  }

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const slice = pending.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, orgId } of slice) batch.update(ref, { orgId });
    await batch.commit();
    stats.wrote += slice.length;
    console.log(`  wrote ${stats.wrote}/${pending.length}`);
  }

  console.log(`Done. Backfilled orgId on ${stats.wrote} applications.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
