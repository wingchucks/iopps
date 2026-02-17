import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const snapshot = await adminDb.collection("applications")
    .where("applicantUid", "==", authResult.decodedToken.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ applications });
}
