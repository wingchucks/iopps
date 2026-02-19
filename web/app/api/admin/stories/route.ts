import { NextResponse, type NextRequest } from "next/server";
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

  let query: FirebaseFirestore.Query = adminDb.collection("successStories").orderBy("createdAt", "desc");

  if (status === "published" || status === "draft") {
    query = query.where("status", "==", status);
  }

  const snapshot = await query.get();
  const stories = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ stories });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  const story = {
    title: body.title || "",
    personName: body.personName || "",
    nation: body.nation || "",
    pullQuote: body.pullQuote || "",
    fullStory: body.fullStory || "",
    heroPhoto: body.heroPhoto || "",
    videoUrl: body.videoUrl || "",
    tags: body.tags || [],
    status: body.status || "draft",
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection("successStories").add(story);

  return NextResponse.json({ id: docRef.id, ...story }, { status: 201 });
}
