import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/csrf";
import { buildEmailVerificationContinueUrl } from "@/lib/auth-verification-email";
import { sendAccountVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

function getSiteUrl(req: NextRequest): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) return configuredSiteUrl;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (!host) return "https://www.iopps.ca";

  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  return `${forwardedProto}://${host}`;
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { nextPath?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return NextResponse.json({ error: "Authenticated account is missing an email address" }, { status: 400 });
    }

    if (decoded.email_verified === true) {
      return NextResponse.json({ sent: false, alreadyVerified: true });
    }

    const continueUrl = buildEmailVerificationContinueUrl(getSiteUrl(req), body.nextPath);
    const verificationLink = await auth.generateEmailVerificationLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });

    const result = await sendAccountVerificationEmail({
      email,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
      verificationLink,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[auth/verification-email] Failed:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
