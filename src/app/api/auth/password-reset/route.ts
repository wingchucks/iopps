import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/csrf";
import { verifyAppCheckFromRequest } from "@/lib/server/app-check";
import { reservePasswordReset } from "@/lib/server/password-reset-limit";
import { sendAccountPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!validateOrigin(req) || !await verifyAppCheckFromRequest(req)) return NextResponse.json({ error: "Please refresh the page and try again." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Password recovery is temporarily unavailable. Please try again later." }, { status: 503 });
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (!await reservePasswordReset(getAdminDb(), email, ip)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    try {
      const resetLink = await getAdminAuth().generatePasswordResetLink(email, { url: "https://www.iopps.ca/login", handleCodeInApp: false });
      await sendAccountPasswordResetEmail(email, resetLink);
    } catch (error) {
      // Account existence and provider failure must never become an email lookup oracle.
      if ((error as { code?: string }).code !== "auth/user-not-found") console.error("[password-reset] Delivery unavailable");
    }
    return NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Password recovery is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
