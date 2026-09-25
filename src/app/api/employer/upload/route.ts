import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";

export const runtime = "nodejs";

// Opportunity posters are the only caller; never accept a client-chosen storage path.
const ALLOWED_FOLDERS = new Set(["uploads", "events/posters", "scholarships/posters"]);

// Extension and signature come from the verified image type, not the client file name.
const IMAGE_TYPES: Record<string, { ext: string; matches: (bytes: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", matches: b => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", matches: b => b.length > 7 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/gif": { ext: "gif", matches: b => b.length > 5 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")) },
  "image/webp": { ext: "webp", matches: b => b.length > 11 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
};

export async function POST(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    if (!["owner", "admin"].includes(context.orgRole)) {
      return NextResponse.json({ error: "An organization owner or admin can upload images." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    // Validate file type
    const imageType = IMAGE_TYPES[file.type];
    if (!imageType) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!imageType.matches(buffer)) {
      return NextResponse.json({ error: "The file content is not a valid image" }, { status: 400 });
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ error: "Storage bucket is not configured" }, { status: 500 });
    }
    const bucket = getStorage().bucket(bucketName);
    const filename = `${folder}/${context.orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imageType.ext}`;
    const fileRef = bucket.file(filename);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: { uploadedBy: context.uid, orgId: context.orgId },
      },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return NextResponse.json({ url: publicUrl, filename });
  } catch (error) {
    if (error instanceof EmployerApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Upload error:", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
