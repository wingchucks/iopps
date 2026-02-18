import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const COOKIE_NAME = "__session";

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/feed",
  "/profile",
  "/settings",
  "/messages",
  "/notifications",
  "/saved",
  "/applications",
  "/mentorship",
  "/learning",
  "/org/dashboard",
  "/org/onboarding",
  "/org/checkout",
  "/org/plans",
  "/admin",
  "/setup",
  "/verify-email",
];

// Routes that authed users should be redirected away from
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

// Pages allowed for unverified email users
const UNVERIFIED_ALLOWED = ["/verify-email", "/settings", "/api"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  );
}

function isUnverifiedAllowed(pathname: string): boolean {
  return UNVERIFIED_ALLOWED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;

  interface SessionPayload {
    exp?: number;
    email_verified?: boolean;
    firebase?: { sign_in_provider?: string };
  }

  let payload: SessionPayload | null = null;
  let isValid = false;

  if (cookie) {
    try {
      // Lightweight decode — no signature verification (that's done server-side in the API route).
      // We only check structure and expiry here for Edge performance.
      const decoded = decodeJwt(cookie);
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp > now) {
        payload = decoded as unknown as SessionPayload;
        isValid = true;
      }
    } catch {
      // Invalid JWT — treat as unauthenticated
    }
  }

  // Protected route without valid session → redirect to login
  if (isProtected(pathname) && !isValid) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authed user on auth page → redirect to feed
  if (isAuthPage(pathname) && isValid) {
    const feedUrl = req.nextUrl.clone();
    feedUrl.pathname = "/feed";
    feedUrl.search = "";
    return NextResponse.redirect(feedUrl);
  }

  // Email verification enforcement for password users
  if (
    isValid &&
    payload &&
    isProtected(pathname) &&
    !isUnverifiedAllowed(pathname) &&
    payload.email_verified === false &&
    payload.firebase?.sign_in_provider === "password"
  ) {
    const verifyUrl = req.nextUrl.clone();
    verifyUrl.pathname = "/verify-email";
    verifyUrl.search = "";
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, logo.png, manifest.json (public assets)
     * - API routes for session management (prevent redirect loops)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|manifest\\.json|api/auth/).*)",
  ],
};
