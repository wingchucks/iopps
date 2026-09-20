import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp, getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { cleanClosedAccountUploads } from "@/lib/server/account-upload-cleanup";

export const runtime = "nodejs";
export const maxDuration = 300;
const LEASE_MS = 360_000; // Longer than the invocation's hard runtime limit.
const RETRY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deadline = Date.now() + 240_000;
  const db = getAdminDb();
  const jobs = await db.collection("account_cleanup").where("notBefore", "<=", new Date().toISOString()).limit(50).get();
  const bucket = getStorage(getAdminApp()).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  let completed = 0, failed = 0;
  for (const job of jobs.docs) {
    if (Date.now() >= deadline) break;
    const owner = randomUUID();
    try {
      const claimed = await db.runTransaction(async tx => {
        const snapshot = await tx.get(job.ref);
        const data = snapshot.data();
        if (!data || !Number.isFinite(Date.parse(data.notBefore)) || Date.parse(data.notBefore) > Date.now()
          || (data.leaseUntil && Date.parse(data.leaseUntil) > Date.now())) return false;
        const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
        const graceExpired = Number.isFinite(Date.parse(data.authRemovedAt))
          && Date.parse(data.authRemovedAt) + 90 * 60 * 1000 <= Date.now();
        // A pre-grace cursor can skip late uploads sorting before that cursor.
        const startFinalSweep = graceExpired && data.finalSweepStarted !== true;
        tx.update(job.ref, { leaseOwner: owner, leaseUntil, notBefore: leaseUntil,
          ...(startFinalSweep ? { cursor: null, finalSweepStarted: true } : {}) });
        return { cursor: startFinalSweep ? null : data.cursor, authRemovedAt: data.authRemovedAt };
      });
      if (!claimed) continue;
      const result = await cleanClosedAccountUploads(db, bucket, getAdminAuth(), job.id, { cursor: claimed.cursor, deadline,
        onAuthRemoved: async () => {
          if (Number.isFinite(Date.parse(claimed.authRemovedAt))) return;
          await db.runTransaction(async tx => {
            const data = (await tx.get(job.ref)).data();
            if (!data || data.leaseOwner !== owner || !(Date.parse(data.leaseUntil) > Date.now())) throw new Error("Cleanup lease lost");
            if (!Number.isFinite(Date.parse(data.authRemovedAt))) {
              tx.update(job.ref, { authRemovedAt: new Date().toISOString(), finalSweepStarted: false });
            }
          });
        },
        assertOwnership: async () => {
          const data = (await job.ref.get()).data();
          if (!data || data.leaseOwner !== owner || !(Date.parse(data.leaseUntil) > Date.now())) throw new Error("Cleanup lease lost");
        },
      });
      const removed = await db.runTransaction(async tx => {
        const data = (await tx.get(job.ref)).data();
        if (!data || data.leaseOwner !== owner || !(Date.parse(data.leaseUntil) > Date.now())) return false;
        if (data.finalSweepStarted !== true) {
          const graceEnd = Date.parse(data.authRemovedAt) + 90 * 60 * 1000;
          if (!Number.isFinite(graceEnd)) throw new Error("Auth removal is not confirmed");
          tx.update(job.ref, { cursor: result.cursor, leaseOwner: null, leaseUntil: null, lastError: null,
            notBefore: new Date(result.cursor ? Math.min(Date.now() + 60_000, graceEnd) : graceEnd).toISOString() });
          return false;
        }
        if (result.cursor) {
          tx.update(job.ref, { cursor: result.cursor, leaseOwner: null, leaseUntil: null, lastError: null,
            notBefore: new Date(Date.now() + 60_000).toISOString() });
          return false;
        }
        tx.delete(job.ref);
        return true;
      });
      if (removed) completed++;
    } catch {
      failed++;
      // Never let an expired worker resurrect or reschedule a successor's job.
      // If the queue itself is unavailable, the existing lease expires for retry.
      try {
        await db.runTransaction(async tx => {
          const data = (await tx.get(job.ref)).data();
          if (!data || data.leaseOwner !== owner || !(Date.parse(data.leaseUntil) > Date.now())) return;
          tx.update(job.ref, { leaseOwner: null, leaseUntil: null, lastAttemptAt: new Date().toISOString(), lastError: "Cleanup needs retry", notBefore: new Date(Date.now() + RETRY_MS).toISOString() });
        });
      } catch { console.error("[account-cleanup] Queue update failed; lease retained for retry"); }
    }
  }
  return NextResponse.json({ completed, failed }, { status: failed ? 503 : 200 });
}
