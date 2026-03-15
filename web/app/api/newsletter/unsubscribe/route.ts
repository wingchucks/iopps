// Save this as: app/api/newsletter/unsubscribe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return new NextResponse("<h1>Error</h1><p>Service unavailable</p>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return new NextResponse("<h1>Invalid link</h1>", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const snap = await adminDb
      .collection("newsletter_subscribers")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: "unsubscribed",
        unsubscribedAt: FieldValue.serverTimestamp(),
      });
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html><head><title>Unsubscribed | IOPPS</title></head>
      <body style="font-family:Arial;text-align:center;padding:60px;background:#1C1C1C;color:white;">
        <h1 style="color:#00EDBA;">Unsubscribed</h1>
        <p>You've been removed from the IOPPS Weekly Newsletter.</p>
        <p style="color:#999;">We're sorry to see you go. You can re-subscribe anytime at <a href="https://www.iopps.ca" style="color:#00EDBA;">iopps.ca</a></p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("[Newsletter Unsubscribe]", error);
    return new NextResponse("<h1>Something went wrong</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
