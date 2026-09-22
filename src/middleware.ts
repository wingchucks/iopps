import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { maintenanceResponse } from "./lib/launch-maintenance";

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

// Login resolves the correct workspace for an existing session client-side.
const AUTH_PAGES = ["/signup", "/forgot-password"];

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
  // Header-preserving middleware receives raw transport URLs. Keep the same
  // canonical authorization boundary for document, Flight and data requests.
  const rawPath = req.nextUrl.pathname;
  const dataPath = /^\/_next\/data\/[^/]+\/(.+)\.json$/.exec(rawPath);
  const segmentMarker = rawPath.indexOf(".segments/");
  const segmentPath = segmentMarker >= 0 && rawPath.endsWith(".segment.rsc")
    && rawPath.length > segmentMarker + ".segments/".length + ".segment.rsc".length
    && !/[\r\n\u2028\u2029]/.test(rawPath)
    ? rawPath.slice(0, segmentMarker) : null;
  const canonicalPath = dataPath ? `/${dataPath[1] === "index" ? "" : dataPath[1]}`
    : segmentPath !== null ? segmentPath || "/"
    : rawPath.endsWith(".rsc") ? rawPath.slice(0, -4) || "/" : rawPath;
  req.nextUrl.pathname = canonicalPath;
  req.nextUrl.buildId = "";
  req.nextUrl.searchParams.delete("_rsc");
  const maintenance = maintenanceResponse(req.nextUrl.pathname, process.env.IOPPS_MAINTENANCE_MODE, req.method);
  if (maintenance) return maintenance;

  const { pathname } = req.nextUrl;
  const retired = ["/schools", "/programs", "/education", "/training"];
  if (retired.some(prefix => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    const target = req.nextUrl.clone(); target.pathname = "/opportunities-update"; target.search = "";
    return NextResponse.redirect(target, 307);
  }
  if (pathname === "/shop" || pathname.startsWith("/shop/")) return NextResponse.redirect(new URL("/businesses", req.url), 307);
  if (pathname === "/spotlight") return NextResponse.redirect(new URL("/livestreams", req.url), 307);
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
    loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // A verified account may still need to finish organization signup.
  const resumingOrganization = pathname === "/signup" && req.nextUrl.searchParams.get("resume") === "organization";
  if (isAuthPage(pathname) && isValid && !resumingOrganization) {
    const accountUrl = req.nextUrl.clone();
    accountUrl.pathname = "/login";
    return NextResponse.redirect(accountUrl);
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
    verifyUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(verifyUrl);
  }

  // Session-obsolete speculation cannot use a private route's segment in
  // the login payload. Next treats a non-Flight 204 as a prefetch cache miss.
  // Never apply this to navigation or login's own valid segment requests.
  const segment = req.headers.get("next-router-segment-prefetch");
  if (pathname === "/login" && req.headers.get("rsc") === "1" &&
      req.headers.get("next-router-prefetch") === "1" && segment &&
      [...PROTECTED_PREFIXES, ...AUTH_PAGES].some(prefix => segment.startsWith(prefix + "/"))) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
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
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|manifest\\.json).*)",
  ],
};
