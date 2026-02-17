import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Find draft posts with a scheduledPublishAt in the past
  const now = new Date();
  const snapshot = await adminDb.collection("posts")
    .where("status", "==", "draft")
    .where("scheduledPublishAt", "<=", now)
    .limit(100)
    .get();

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  return NextResponse.json({ published: snapshot.size });
}
