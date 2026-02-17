import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (!uid || !token) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  // Verify token (simple HMAC check)
  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", process.env.UNSUBSCRIBE_SECRET || "secret")
    .update(uid).digest("hex").slice(0, 16);

  if (token !== expected) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  await adminDb.collection("users").doc(uid).update({
    "emailDigest.frequency": "off",
    "emailDigest.unsubscribedAt": FieldValue.serverTimestamp(),
  });

  return new NextResponse(
    `<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
      <div style="text-align:center"><h1>Unsubscribed</h1><p>You will no longer receive email digests from IOPPS.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://iopps.ca"}">Return to IOPPS.ca</a></div>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
