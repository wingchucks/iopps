import { NextResponse, type NextRequest } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";
import { requireAdminServiceRequest } from "@/lib/internal-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminServiceRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const { base64, mimeType, path: destPath } = await request.json();
    if (!base64 || !destPath) {
      return NextResponse.json({ error: "base64 and path required" }, { status: 400 });
    }

    // Ensure admin app is initialized
    const app = getAdminApp();
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage(app).bucket("iopps-c2224.firebasestorage.app");

    const buffer = Buffer.from(base64, "base64");
    const file = bucket.file(destPath);

    await file.save(buffer, {
      metadata: { contentType: mimeType || "image/jpeg" },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/iopps-c2224.firebasestorage.app/${destPath}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed", detail: String(err) }, { status: 500 });
  }
}
