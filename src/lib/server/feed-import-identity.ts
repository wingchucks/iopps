import { createHash } from "node:crypto";
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
