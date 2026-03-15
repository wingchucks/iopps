import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Get instant alert subscribers
  const usersSnap = await adminDb.collection("users")
    .where("emailDigest.frequency", "==", "instant")
    .where("disabled", "==", false)
    .get();

  if (usersSnap.empty) return NextResponse.json({ sent: 0, reason: "no instant subscribers" });

  // Get jobs posted in last 15 minutes
  const since = new Date();
  since.setMinutes(since.getMinutes() - 15);
  const jobsSnap = await adminDb.collection("posts")
    .where("type", "==", "job")
    .where("status", "==", "active")
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const jobs = jobsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (jobs.length === 0) return NextResponse.json({ sent: 0, reason: "no new jobs in last 15 min" });

  let sent = 0;
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    // TODO: Send actual email via service
    console.log(`[Instant Alert] Would send ${jobs.length} new jobs to ${user.email}`);

    await adminDb.collection("users").doc(userDoc.id).update({
      "emailDigest.lastSentAt": FieldValue.serverTimestamp(),
    });
    sent++;
  }

  return NextResponse.json({ sent, jobCount: jobs.length });
}
