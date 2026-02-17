import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  let query: FirebaseFirestore.Query = adminDb.collection("users");
  if (role) query = query.where("role", "==", role);
  query = query.orderBy("createdAt", "desc").offset((page - 1) * limit).limit(limit);

  const snapshot = await query.get();
  let users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u: Record<string, unknown>) =>
      (u.displayName as string)?.toLowerCase().includes(q) ||
      (u.email as string)?.toLowerCase().includes(q) ||
      (u.firstName as string)?.toLowerCase().includes(q) ||
      (u.lastName as string)?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();
  const { uid, ...updates } = body;
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

  updates.updatedAt = FieldValue.serverTimestamp();
  await adminDb.collection("users").doc(uid).update(updates);

  return NextResponse.json({ success: true });
}
