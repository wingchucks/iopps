import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp, getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { cleanClosedAccountUploads } from "@/lib/server/account-upload-cleanup";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getAdminDb();
  const jobs = await db.collection("account_cleanup").where("notBefore", "<=", new Date().toISOString()).limit(50).get();
  const bucket = getStorage(getAdminApp()).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  let completed = 0, failed = 0;
  for (const job of jobs.docs) {
    try {
      await cleanClosedAccountUploads(db, bucket, getAdminAuth(), job.id);
      await job.ref.delete();
      completed++;
    } catch {
      failed++;
      await job.ref.update({ lastAttemptAt: new Date().toISOString(), lastError: "Cleanup needs retry", notBefore: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    }
  }
  return NextResponse.json({ completed, failed }, { status: failed ? 503 : 200 });
}
