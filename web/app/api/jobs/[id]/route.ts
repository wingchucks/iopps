import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });
  const { id } = await params;
  const doc = await adminDb.collection("posts").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Increment view count
  await adminDb.collection("posts").doc(id).update({ viewCount: FieldValue.increment(1) });

  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const doc = await adminDb.collection("posts").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership or admin
  const postData = doc.data()!;
  const isAdmin = authResult.decodedToken.admin === true || authResult.decodedToken.role === "admin";
  if (!isAdmin && postData.orgId) {
    const orgSnap = await adminDb.collection("organizations").doc(postData.orgId).get();
    const orgData = orgSnap.data();
    if (!orgData?.teamMemberIds?.includes(authResult.decodedToken.uid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { id: _id, ...updates } = body;
  updates.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection("posts").doc(id).update(updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { id } = await params;
  // Soft delete
  await adminDb.collection("posts").doc(id).update({
    status: "hidden",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
