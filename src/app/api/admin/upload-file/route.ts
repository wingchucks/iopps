import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { base64, mimeType, path: destPath } = await request.json();
    if (!base64 || !destPath) {
      return NextResponse.json({ error: "base64 and path required" }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    const bucket = getStorage().bucket("iopps-c2224.firebasestorage.app");
    const file = bucket.file(destPath);

    await file.save(buffer, {
      metadata: { contentType: mimeType || "image/jpeg" },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/iopps-c2224.firebasestorage.app/${destPath}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}