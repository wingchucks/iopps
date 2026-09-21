import { createHash } from "node:crypto";
import { feedJobKey } from "./feed-source";
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

/** Atomic reservation prevents concurrent manual/cron imports. Never revive a tombstone. */
export async function createImportedJobOnce(db: Firestore, data: Job): Promise<boolean> {
  const identity = feedImportIdentity(data);
  const reservation = db.collection("feedImportIdentities").doc(identity);
  const job = db.collection("jobs").doc(`import-${identity}`);
  const mirror = db.collection("posts").doc(job.id);
  return db.runTransaction(async tx => {
    const [claim, existing, legacy] = await Promise.all([tx.get(reservation), tx.get(job), tx.get(mirror)]);
    if (claim.exists || existing.exists || legacy.exists) return false;
    tx.create(reservation, { version: 1, jobId: job.id, feedId: data.feedId, employerId: data.employerId });
    tx.create(job, { ...data, importIdentity: identity });
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
