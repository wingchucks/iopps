import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { createHmac } from "crypto";

export const runtime = "nodejs";

function generateToken(uid: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || "")
    .update(uid)
    .digest("hex")
    .substring(0, 32);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (!uid || !token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
  }

  const expected = generateToken(uid);
  if (token !== expected) {
    return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
  }

  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).set({ newsletterOptIn: false }, { merge: true });
    return NextResponse.redirect(new URL("/unsubscribe?success=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/unsubscribe?error=failed", request.url));
  }
}