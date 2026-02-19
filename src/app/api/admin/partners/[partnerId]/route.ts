import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { partnerId } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const allowed = ["name", "logoUrl", "websiteUrl", "tier", "visible", "spotlight"];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await adminDb.collection("partners").doc(partnerId).update(updates);

  return NextResponse.json({ id: partnerId, ...updates });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { partnerId } = await params;
  await adminDb.collection("partners").doc(partnerId).delete();

  return NextResponse.json({ success: true });
}
