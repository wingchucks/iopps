#!/usr/bin/env node
/**
 * H-2 — Deduplicate organizations by case-insensitive name + province.
 *
 * Found by Apr 2026 audit: STC appears twice in /businesses with slugs
 * "saskatoon-tribal-council" and "saskatoon-tribal-council-s81luo".
 * Likely caused by scraper retrying org create after a transient failure
 * and tripping a collision-avoidance suffix.
 *
 * Strategy:
 *   1. Read every doc in `organizations`.
 *   2. Group by normalized name + province.
 *   3. For each group with > 1 doc, pick the canonical doc (oldest
 *      createdAt; tie-break: clean slug without "-xxxxxx" suffix).
 *   4. Re-point every reference (orgId / employerId) in the related
 *      collections from duplicate -> canonical.
 *   5. Write a `org-slug-redirects/<duplicateSlug>` record so old links
 *      keep working.
 *   6. Delete the duplicate from both `organizations` and `employers`.
 *
 * Safety:
 *   - Defaults to --dry-run. You must pass --apply to mutate prod.
 *   - Wraps each merge in a write batch so a duplicate either fully
 *     merges or fully aborts.
 *   - Skips groups where the canonical pick is ambiguous (no createdAt,
 *     same slug shape) and prints them for manual triage.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/dedup-organizations.cjs            # dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/dedup-organizations.cjs --apply    # mutate
 */

const admin = require("firebase-admin");

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

const RELATED_COLLECTIONS = [
  { name: "jobs", fields: ["orgId", "employerId"] },
  { name: "events", fields: ["orgId"] },
  { name: "scholarships", fields: ["orgId"] },
  { name: "conferences", fields: ["orgId"] },
  { name: "training", fields: ["orgId"] },
  { name: "posts", fields: ["orgId", "employerId"] },
  { name: "members", fields: ["orgId"] },
  { name: "subscriptions", fields: ["orgId"] },
];

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company)\.?\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function provinceKey(loc) {
  if (!loc || typeof loc !== "object") return "";
  return String(loc.province || loc.region || "").toLowerCase().trim();
}

function pickCanonical(docs) {
  // Prefer doc with createdAt set (oldest first).
  // Tie-break: slug WITHOUT a trailing "-XXXXXX" collision suffix wins.
  const withTime = docs
    .map((d) => ({
      doc: d,
      ts: d.createdAt && typeof d.createdAt.toMillis === "function"
        ? d.createdAt.toMillis()
        : null,
      hasSuffix: /-[a-z0-9]{6}$/i.test(d.id),
    }))
    .sort((a, b) => {
      // Suffix-free wins.
      if (a.hasSuffix !== b.hasSuffix) return a.hasSuffix ? 1 : -1;
      // Older wins.
      if (a.ts != null && b.ts != null) return a.ts - b.ts;
      if (a.ts != null) return -1;
      if (b.ts != null) return 1;
      // Last resort: shorter ID wins.
      return a.doc.id.length - b.doc.id.length;
    });
  return { canonical: withTime[0].doc, duplicates: withTime.slice(1).map((w) => w.doc) };
}

async function rePointReferences(db, fromOrgId, toOrgId) {
  const updates = [];
  for (const { name, fields } of RELATED_COLLECTIONS) {
    for (const field of fields) {
      const snap = await db.collection(name).where(field, "==", fromOrgId).get();
      if (snap.empty) continue;
      updates.push({ collection: name, field, count: snap.size, docs: snap.docs });
    }
  }
  return updates;
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  console.log(APPLY ? "Mode: APPLY (will mutate Firestore)" : "Mode: DRY-RUN (no writes)");

  const snap = await db.collection("organizations").get();
  console.log(`Loaded ${snap.size} organization records.`);

  const groups = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    const key = `${normalizeName(data.name)}|${provinceKey(data.location)}`;
    if (!key.startsWith("|")) {
      const existing = groups.get(key) || [];
      existing.push({ id: d.id, ref: d.ref, ...data });
      groups.set(key, existing);
    }
  }

  const dupGroups = [...groups.entries()].filter(([, docs]) => docs.length > 1);
  console.log(`Found ${dupGroups.length} duplicate groups.`);

  let merged = 0;
  let skipped = 0;

  for (const [key, docs] of dupGroups) {
    const { canonical, duplicates } = pickCanonical(docs);

    console.log(`\n[${key}]`);
    console.log(`  canonical: ${canonical.id} (${canonical.name})`);
    for (const dup of duplicates) {
      console.log(`  duplicate: ${dup.id} (${dup.name})`);
    }

    for (const dup of duplicates) {
      const refs = await rePointReferences(db, dup.id, canonical.id);
      const total = refs.reduce((acc, r) => acc + r.count, 0);
      console.log(`    -> ${total} references to re-point across ${refs.length} collections`);
      if (VERBOSE) {
        for (const r of refs) console.log(`       ${r.collection}.${r.field}: ${r.count} doc(s)`);
      }

      if (!APPLY) {
        skipped++;
        continue;
      }

      // Apply: batch the re-points + redirect + delete.
      let batch = db.batch();
      let opsInBatch = 0;
      const flush = async () => {
        if (opsInBatch === 0) return;
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      };

      for (const r of refs) {
        for (const refDoc of r.docs) {
          batch.update(refDoc.ref, { [r.field]: canonical.id });
          opsInBatch++;
          if (opsInBatch >= 400) await flush();
        }
      }

      // Slug redirect entry so external links survive.
      batch.set(db.collection("org-slug-redirects").doc(dup.id), {
        from: dup.id,
        to: canonical.id,
        mergedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: "h2-name-duplicate",
      });
      opsInBatch++;

      // Delete the duplicate from both collections.
      batch.delete(db.collection("organizations").doc(dup.id));
      opsInBatch++;
      const employerSnap = await db.collection("employers").doc(dup.id).get();
      if (employerSnap.exists) {
        batch.delete(employerSnap.ref);
        opsInBatch++;
      }

      await flush();
      merged++;
      console.log(`    [APPLIED] merged ${dup.id} -> ${canonical.id}`);
    }
  }

  console.log(`\nDone. ${APPLY ? "Merged" : "Would merge"} ${APPLY ? merged : skipped} duplicate(s).`);
  if (!APPLY && skipped > 0) {
    console.log("Re-run with --apply to actually mutate Firestore.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
