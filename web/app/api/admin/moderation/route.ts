import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }


  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const startAfter = searchParams.get("startAfter");

  let query = adminDb.collection("contentFlags").orderBy("createdAt", "desc");

  if (status === "pending") {
    query = query.where("status", "==", "pending");
  } else if (status === "resolved") {
    query = query.where("status", "==", "resolved");
  }

  if (severity) {
    query = query.where("severity", "==", severity);
  }

  if (startAfter) {
    const cursor = await adminDb.collection("contentFlags").doc(startAfter).get();
    if (cursor.exists) {
      query = query.startAfter(cursor);
    }
  }

  query = query.limit(limit);

  const snapshot = await query.get();
  const reports = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json({
    reports,
    hasMore: snapshot.docs.length === limit,
    lastId: snapshot.docs[snapshot.docs.length - 1]?.id ?? null,
  });
}
