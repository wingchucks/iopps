import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { storyId } = await params;
  const doc = await adminDb.collection("successStories").doc(storyId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { storyId } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const allowed = ["title", "personName", "nation", "pullQuote", "fullStory", "heroPhoto", "videoUrl", "tags", "status"];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await adminDb.collection("successStories").doc(storyId).update(updates);

  return NextResponse.json({ id: storyId, ...updates });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { storyId } = await params;
  await adminDb.collection("successStories").doc(storyId).delete();

  return NextResponse.json({ success: true });
}
