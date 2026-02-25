import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = getAdminDb();

    // Check jobs collection first
    const jobRef = db.collection("jobs").doc(id);
    const jobSnap = await jobRef.get();

    if (jobSnap.exists) {
      await jobRef.update({ viewCount: FieldValue.increment(1) });
      return NextResponse.json({ ok: true });
    }

    // Fall back to posts collection
    const postRef = db.collection("posts").doc(id);
    const postSnap = await postRef.get();

    if (postSnap.exists) {
      await postRef.update({ viewCount: FieldValue.increment(1) });
      return NextResponse.json({ ok: true });
    }

    // Document not found in either collection — still return ok
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[job-view] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
