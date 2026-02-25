import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

/**
 * POST /api/org/upload
 * Step 1: Returns a signed upload URL for the client to PUT directly to GCS.
 * Body: { type: "logo" | "banner", contentType: "image/..." }
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  const uid = auth.decodedToken.uid;
  const db = getAdminDb();

  const memberSnap = await db.collection("members").doc(uid).get();
  const member = memberSnap.data();
  if (!member?.orgId) {
    return NextResponse.json({ error: "Not an org member" }, { status: 403 });
  }
  const orgId = member.orgId;

  const body = await request.json();
  const { type, contentType } = body as { type?: string; contentType?: string };

  if (!type || !["logo", "banner"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!contentType?.startsWith("image/")) {
    return NextResponse.json({ error: "Must be an image" }, { status: 400 });
  }

  const bucket = getStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
  const path = type === "logo" ? `org-logos/${orgId}` : `org-banners/${orgId}`;
  const blob = bucket.file(path);

  const [signedUrl] = await blob.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    contentType,
  });

  return NextResponse.json({ signedUrl, path, orgId });
}

/**
 * PUT /api/org/upload
 * Step 2: After client uploads to GCS, call this to make the file public
 * and update the org document.
 * Body: { type: "logo" | "banner" }
 */
export async function PUT(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  const uid = auth.decodedToken.uid;
  const db = getAdminDb();

  const memberSnap = await db.collection("members").doc(uid).get();
  const member = memberSnap.data();
  if (!member?.orgId) {
    return NextResponse.json({ error: "Not an org member" }, { status: 403 });
  }
  const orgId = member.orgId;

  const body = await request.json();
  const { type } = body as { type?: string };

  if (!type || !["logo", "banner"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const bucket = getStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
  const path = type === "logo" ? `org-logos/${orgId}` : `org-banners/${orgId}`;
  const blob = bucket.file(path);

  await blob.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

  const field = type === "logo" ? "logoUrl" : "bannerUrl";
  await db.collection("organizations").doc(orgId).update({ [field]: publicUrl });

  return NextResponse.json({ url: publicUrl });
}
