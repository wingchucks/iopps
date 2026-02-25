import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  const uid = auth.decodedToken.uid;
  const db = getAdminDb();

  // Look up the user's org membership
  const memberSnap = await db.collection("members").doc(uid).get();
  const member = memberSnap.data();
  if (!member?.orgId) {
    return NextResponse.json({ error: "Not an org member" }, { status: 403 });
  }
  const orgId = member.orgId;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "logo" or "banner"

  if (!file || !type || !["logo", "banner"].includes(type)) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const bucket = getStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
  const path = type === "logo" ? `org-logos/${orgId}` : `org-banners/${orgId}`;
  const blob = bucket.file(path);

  const buffer = Buffer.from(await file.arrayBuffer());
  await blob.save(buffer, {
    metadata: { contentType: file.type },
  });

  await blob.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

  // Update the org document
  const field = type === "logo" ? "logoUrl" : "bannerUrl";
  await db.collection("organizations").doc(orgId).update({ [field]: publicUrl });

  return NextResponse.json({ url: publicUrl });
}
