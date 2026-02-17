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
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "createdAt_desc";

  let query: FirebaseFirestore.Query = adminDb.collection("posts");
  if (type) query = query.where("type", "==", type);
  if (status) query = query.where("status", "==", status);
  if (featured === "true") query = query.where("featured", "==", true);

  const [sortField, sortDir] = sort.split("_");
  query = query.orderBy(sortField || "createdAt", (sortDir as "asc" | "desc") || "desc");
  query = query.offset((page - 1) * limit).limit(limit);

  const snapshot = await query.get();
  let posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter((p: Record<string, unknown>) =>
      (p.title as string)?.toLowerCase().includes(q) ||
      (p.orgName as string)?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ posts });
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();

  // Create new post (used by admin stories creator)
  if (body.create) {
    const { create: _, id: _id, ...postData } = body;
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Stories don't expire

    const ref = await adminDb.collection("posts").add({
      orgId: "admin",
      orgName: "IOPPS",
      orgLogoURL: null,
      orgTier: "none",
      location: { city: "", province: "" },
      featured: false,
      featuredUntil: null,
      viewCount: 0,
      saveCount: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ...postData,
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  }

  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  updates.updatedAt = FieldValue.serverTimestamp();
  await adminDb.collection("posts").doc(id).update(updates);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Soft delete
  await adminDb.collection("posts").doc(id).update({
    status: "hidden",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
