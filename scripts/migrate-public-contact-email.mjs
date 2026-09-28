#!/usr/bin/env node
/**
 * One-time migration: separate the public contact email from the private
 * account contact on existing organizations.
 *
 * Signup copied the owner's sign-in email into `contactEmail`, which public
 * pages displayed. Public pages now show only the opt-in `publicContactEmail`.
 * For records created before that change (no `publicContactEmail` field):
 *   - a legacy `contactEmail` that differs from every owner sign-in email was
 *     set deliberately, so it stays public (copied to `publicContactEmail`);
 *   - a copy of an owner's sign-in email, or no valid email, becomes blank
 *     (hidden) until the owner adds or confirms it in the profile editor.
 * `contactEmail` itself is never changed; IOPPS keeps using it privately.
 *
 * Safety:
 *   - Dry run by default; pass --apply to write.
 *   - Requires an explicit --project, and prints only record ids and outcomes,
 *     never email addresses.
 *   - Idempotent: records that already have `publicContactEmail` are skipped.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/migrate-public-contact-email.mjs --project iopps-c2224          # dry run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/migrate-public-contact-email.mjs --project iopps-c2224 --apply  # write
 */
import { pathToFileURL } from "node:url";

// Same linear check as isPlausibleEmail in src/lib/public-organization.ts.
function plausibleEmail(value) {
  if (!value || value.length > 254 || /\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

/**
 * Decides the public email for one legacy record. Returns null when the record
 * already has an explicit public email and must not be touched.
 */
export function publicContactMigration(record, ownerSignInEmails) {
  if (Object.prototype.hasOwnProperty.call(record, "publicContactEmail")) return null;
  const legacy = typeof record.contactEmail === "string" ? record.contactEmail.trim() : "";
  if (!legacy || !plausibleEmail(legacy)) return { publicContactEmail: "", reason: "no-valid-email" };
  if (ownerSignInEmails.has(legacy.toLowerCase())) return { publicContactEmail: "", reason: "copy-of-sign-in-email" };
  return { publicContactEmail: legacy, reason: "kept-deliberate-email" };
}

async function ownerSignInEmails(db, auth, orgId) {
  const uids = new Set([orgId]);
  const owners = await db.collection("members").where("orgId", "==", orgId).where("orgRole", "==", "owner").get();
  for (const doc of owners.docs) uids.add(doc.id);
  const emails = new Set();
  for (const uid of uids) {
    const user = await db.collection("users").doc(uid).get();
    const stored = user.exists ? user.data()?.email : undefined;
    if (typeof stored === "string" && stored.trim()) emails.add(stored.trim().toLowerCase());
    try {
      const account = await auth.getUser(uid);
      if (account.email) emails.add(account.email.toLowerCase());
    } catch {
      // No sign-in account for this id (for example an admin-created listing).
    }
  }
  return emails;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const project = args[args.indexOf("--project") + 1];
  if (!args.includes("--project") || !project || project.startsWith("--")) {
    throw new Error("Pass --project <firebase-project-id> explicitly.");
  }
  const { initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");
  const app = initializeApp({ projectId: project });
  const db = getFirestore(app);
  const auth = getAuth(app);
  console.log(`${apply ? "APPLY" : "DRY RUN"} on project ${project}`);

  const counts = {};
  let writes = [];
  const flush = async () => {
    if (!apply || !writes.length) { writes = []; return; }
    const batch = db.batch();
    for (const [ref, value] of writes) batch.set(ref, { publicContactEmail: value }, { merge: true });
    await batch.commit();
    writes = [];
  };
  const decided = new Map();
  const organizations = await db.collection("organizations").get();
  for (const doc of organizations.docs) {
    const decision = publicContactMigration(doc.data(), await ownerSignInEmails(db, auth, doc.id));
    if (!decision) { counts.skipped = (counts.skipped || 0) + 1; continue; }
    counts[decision.reason] = (counts[decision.reason] || 0) + 1;
    decided.set(doc.id, decision.publicContactEmail);
    console.log(`organizations/${doc.id}: ${decision.reason}`);
    writes.push([doc.ref, decision.publicContactEmail]);
    if (writes.length >= 400) await flush();
  }
  // Legacy employer mirrors follow their organization, or decide on their own.
  const employers = await db.collection("employers").get();
  for (const doc of employers.docs) {
    const data = doc.data();
    if (Object.prototype.hasOwnProperty.call(data, "publicContactEmail")) continue;
    const orgId = typeof data.orgId === "string" && data.orgId ? data.orgId : doc.id;
    const value = decided.has(orgId)
      ? decided.get(orgId)
      : publicContactMigration(data, await ownerSignInEmails(db, auth, doc.id))?.publicContactEmail;
    if (value === undefined) continue;
    counts.employerMirrors = (counts.employerMirrors || 0) + 1;
    writes.push([doc.ref, value]);
    if (writes.length >= 400) await flush();
  }
  await flush();
  console.log(JSON.stringify(counts, null, 2));
  if (!apply) console.log("No changes written. Re-run with --apply to write.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
