import { cleanupWriteAllowed } from "./job-cleanup-guards.ts";
import { jobCategoryPatch } from "../job-taxonomy.ts";
import { createHash } from "node:crypto";
import { feedJobKey } from "./feed-source.ts";
import type { Firestore } from "firebase-admin/firestore";

type Job = Record<string, unknown>;
const label = (value: unknown) => typeof value === "string" ? value.normalize("NFC").replace(/\s+/gu, " ").trim() : "";
function dateIdentity(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string" && value.trim()) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : value.trim();
  }
  return "";
}

/** No lowercasing of opaque IDs or URLs. Feed namespace and intake remain distinct. */
export function feedImportIdentity(job: Job): string {
  const source = label(job.externalId) || label(job.externalUrl);
  const fields = [label(job.feedId), label(job.employerId), label(job.title), label(job.location), source,
    label(job.requisitionId), dateIdentity(job.publishedAt || job.postedAt)];
  if (fields.slice(0, 5).some(value => !value)) throw new Error("Import identity is incomplete");
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

const UNKNOWN_EMPLOYERS = new Set(["unknown", "n a", "na", "none", "tbd", ""]);

/** Case/whitespace/punctuation-insensitive text for near-duplicate detection.
 * Diacritics fold ("Métis" -> "metis") but nothing is translated or invented. */
export function normalizeFingerprintText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Cross-source duplicate fingerprint: normalized title + employer/org + location.
 * Returns null when the employer is unknown or a field is missing, so unrelated
 * postings can never collapse. Deliberately namespace-agnostic: the same role
 * arriving from two different feeds/sources is the duplicate this guards against.
 * Within one feed the feed's own identity rules (case-sensitive external IDs,
 * requisition IDs, posting dates) still decide, per the existing test contract. */
export function jobFingerprint(job: Job): string | null {
  const title = normalizeFingerprintText(job.title);
  const employer = normalizeFingerprintText(job.employerName ?? job.company ?? job.organization ?? job.employerId);
  const location = normalizeFingerprintText(job.location);
  if (!title || !location || UNKNOWN_EMPLOYERS.has(employer)) return null;
  return createHash("sha256").update(JSON.stringify([title, employer, location])).digest("hex");
}

/** Defense in depth: catch near-duplicates the reservation collection has never
 * seen (legacy records, backfilled fingerprints, direct-write scripts). A match
 * only blocks when it comes from a DIFFERENT source namespace; a feed's own
 * re-imports stay governed by feedImportIdentity/sameImportedIntake.
 * The defensive query sticks to the lowest-common query surface (where/get):
 * chained limit() is valid in production Firestore but not guaranteed by every
 * caller-supplied query double, so the cap is applied in memory instead. */
async function fingerprintDuplicateExists(db: Firestore, fingerprint: string, jobId: string, feedId: unknown): Promise<boolean> {
  const matches = await db.collection("jobs").where("importFingerprint", "==", fingerprint).get();
  return matches.docs.slice(0, 5).some(doc => doc.id !== jobId && (doc.data() as Job | undefined)?.feedId !== feedId);
}

/** Atomic reservation prevents concurrent manual/cron imports. Never revive a tombstone.
 * In addition to the per-source identity claim, a cross-source fingerprint claim
 * (feedImportFingerprints) blocks the same role arriving from a second feed or
 * import path — the "appears twice" duplicate class. A fingerprint claim held by
 * the SAME feedId does not block: that feed's own identity rules decide. */
export async function createImportedJobOnce(db: Firestore, data: Job): Promise<boolean> {
  const identity = feedImportIdentity(data);
  const fingerprint = jobFingerprint(data);
  const reservation = db.collection("feedImportIdentities").doc(identity);
  const job = db.collection("jobs").doc(`import-${identity}`);
  const mirror = db.collection("posts").doc(job.id);
  const fingerprintReservation = fingerprint ? db.collection("feedImportFingerprints").doc(fingerprint) : null;
  if (fingerprint && await fingerprintDuplicateExists(db, fingerprint, job.id, data.feedId)) return false;
  return db.runTransaction(async tx => {
    const reads = [tx.get(reservation), tx.get(job), tx.get(mirror)];
    if (fingerprintReservation) reads.push(tx.get(fingerprintReservation));
    const [claim, existing, legacy, fingerprintClaim] = await Promise.all(reads);
    if (claim.exists || existing.exists || legacy.exists) return false;
    if (fingerprintClaim?.exists) {
      // Same-namespace holder: this feed's own identity rules already decided above.
      // Different-namespace holder: the same role was already imported elsewhere.
      // Claims are never revived, matching the tombstone rule above.
      if ((fingerprintClaim.data() as Job | undefined)?.feedId !== data.feedId) return false;
    }
    if (!await cleanupWriteAllowed(db, tx, job.id, {}, data)) return false;
    tx.create(reservation, { version: 1, jobId: job.id, feedId: data.feedId, employerId: data.employerId });
    if (fingerprintReservation && !fingerprintClaim?.exists) {
      tx.create(fingerprintReservation, { version: 1, jobId: job.id, feedId: data.feedId, employerId: data.employerId, title: data.title });
    }
    tx.create(job, { ...data, ...jobCategoryPatch(data), importIdentity: identity, ...(fingerprint ? { importFingerprint: fingerprint } : {}) });
    return true;
  });
}

/** Keep every intake under a reused source key; select only after intake validation. */
export function importedJobCandidateSelector<T extends { data(): Job }>(docs: T[], feedId: string) {
  const byId = new Map<string, T[]>();
  const byUrl = new Map<string, T[]>();
  const append = (index: Map<string, T[]>, key: string, doc: T) => {
    if (!key) return;
    const candidates = index.get(key);
    if (candidates) candidates.push(doc);
    else index.set(key, [doc]);
  };
  for (const doc of docs) {
    const data = doc.data();
    if (data.externalId && data.feedId === feedId) append(byId, String(data.externalId), doc);
    for (const key of new Set([data.externalUrl, data.applyUrl, data.applicationUrl].map(feedJobKey))) {
      append(byUrl, key, doc);
    }
  }
  return (incoming: Job): T | undefined => {
    const matches = (doc: T) => sameImportedIntake(doc.data(), { ...incoming, feedId });
    // An incompatible ID hit must not suppress another ID intake or URL fallback.
    return byId.get(String(incoming.externalId || ""))?.find(matches)
      ?? byUrl.get(feedJobKey(incoming.externalUrl))?.find(matches);
  };
}

/** Reused requisition URLs must not collapse separately dated intakes or locations. */
export function sameImportedIntake(existing: Job, incoming: Job): boolean {
  if (existing.feedId && incoming.feedId && existing.feedId !== incoming.feedId) return false;
  if (existing.externalId && incoming.externalId && existing.externalId !== incoming.externalId) return false;
  if (label(existing.location) !== label(incoming.location)) return false;
  const oldDate = dateIdentity(existing.publishedAt || existing.postedAt);
  const newDate = dateIdentity(incoming.publishedAt || incoming.postedAt);
  if (oldDate && newDate && oldDate !== newDate) return false;
  if (existing.requisitionId && incoming.requisitionId && existing.requisitionId !== incoming.requisitionId) return false;
  return true;
}
