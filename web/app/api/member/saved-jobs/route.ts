import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const snapshot = await adminDb.collection("bookmarks")
    .where("uid", "==", authResult.decodedToken.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const bookmarks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { postId, postType } = await request.json();
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  // Check duplicate
  const existing = await adminDb.collection("bookmarks")
    .where("uid", "==", authResult.decodedToken.uid)
    .where("postId", "==", postId)
    .limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "Already saved" }, { status: 409 });

  const ref = await adminDb.collection("bookmarks").add({
    uid: authResult.decodedToken.uid,
    postId,
    postType: postType || "job",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Increment save count
  await adminDb.collection("posts").doc(postId).update({ saveCount: FieldValue.increment(1) });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { postId } = await request.json();
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const snapshot = await adminDb.collection("bookmarks")
    .where("uid", "==", authResult.decodedToken.uid)
    .where("postId", "==", postId)
    .limit(1).get();

  if (snapshot.empty) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await snapshot.docs[0].ref.delete();
  await adminDb.collection("posts").doc(postId).update({ saveCount: FieldValue.increment(-1) });

  return NextResponse.json({ success: true });
}
