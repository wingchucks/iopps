import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const doc = await adminDb.collection("users").doc(authResult.decodedToken.uid).get();
  if (!doc.exists) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ uid: doc.id, ...doc.data() });
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();
  const { uid, role, email, createdAt, ...updates } = body;
  void uid; void role; void email; void createdAt; // prevent overwriting protected fields
  updates.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection("users").doc(authResult.decodedToken.uid).update(updates);
  return NextResponse.json({ success: true });
}
