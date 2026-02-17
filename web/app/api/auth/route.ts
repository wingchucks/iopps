import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const result = await verifyAuthToken(request);
  if (!result.success) return result.response;

  const { decodedToken } = result;

  // Fetch user profile from Firestore
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const profile = userDoc.exists ? userDoc.data() : null;

  return NextResponse.json({
    uid: decodedToken.uid,
    email: decodedToken.email,
    role: decodedToken.role || decodedToken.admin ? "admin" : "member",
    profile,
  });
}
