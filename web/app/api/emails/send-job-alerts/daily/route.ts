import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Get daily digest subscribers
  const usersSnap = await adminDb.collection("users")
    .where("emailDigest.frequency", "==", "daily")
    .where("disabled", "==", false)
    .get();

  // Get jobs posted in last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const jobsSnap = await adminDb.collection("posts")
    .where("type", "==", "job")
    .where("status", "==", "active")
    .where("createdAt", ">=", yesterday)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const jobs = jobsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (jobs.length === 0) return NextResponse.json({ sent: 0, reason: "no new jobs" });

  let sent = 0;
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    // TODO: Send actual email via service
    console.log(`[Daily Digest] Would send ${jobs.length} jobs to ${user.email}`);

    await adminDb.collection("users").doc(userDoc.id).update({
      "emailDigest.lastSentAt": FieldValue.serverTimestamp(),
    });
    sent++;
  }

  return NextResponse.json({ sent, jobCount: jobs.length });
}
