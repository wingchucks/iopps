import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { id } = await params;
  const doc = await adminDb.collection("users").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const data = doc.data()!;

  // Return only public fields
  const profile = {
    uid: doc.id,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    displayName: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    photoURL: data.photoURL || null,
    headline: data.headline || "",
    nation: data.nation || "",
    province: data.province || "",
    city: data.city || "",
    bio: data.bio || "",
    skills: data.skills || [],
  };

  return NextResponse.json({ profile });
}
