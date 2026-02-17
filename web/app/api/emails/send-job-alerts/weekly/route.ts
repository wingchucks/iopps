import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const usersSnap = await adminDb.collection("users")
    .where("emailDigest.frequency", "==", "weekly")
    .where("disabled", "==", false)
    .get();

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const jobsSnap = await adminDb.collection("posts")
    .where("type", "==", "job")
    .where("status", "==", "active")
    .where("createdAt", ">=", lastWeek)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  const jobs = jobsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (jobs.length === 0) return NextResponse.json({ sent: 0, reason: "no new jobs" });

  let sent = 0;
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    console.log(`[Weekly Digest] Would send ${jobs.length} jobs to ${user.email}`);
    await adminDb.collection("users").doc(userDoc.id).update({
      "emailDigest.lastSentAt": FieldValue.serverTimestamp(),
    });
    sent++;
  }

  return NextResponse.json({ sent, jobCount: jobs.length });
}
