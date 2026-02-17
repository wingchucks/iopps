import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Essential URL redirects for backwards compatibility.
 * Trimmed from 40+ to the most important ones that protect SEO rankings.
 */
const REDIRECTS: { source: string; destination: string; permanent: boolean }[] =
  [
    // Core URL renames
    { source: "/hub", destination: "/discover", permanent: false },
    { source: "/jobs", destination: "/careers", permanent: true },
    { source: "/jobs-training", destination: "/careers", permanent: true },
    { source: "/scholarships", destination: "/education/scholarships", permanent: true },
    { source: "/marketplace", destination: "/business", permanent: true },
    { source: "/shop", destination: "/business", permanent: true },
    { source: "/powwows", destination: "/community", permanent: true },
    { source: "/events", destination: "/community", permanent: false },
    { source: "/streams", destination: "/live", permanent: true },
    { source: "/signin", destination: "/login", permanent: true },
    { source: "/businesses", destination: "/organizations", permanent: true },
    // Employer → Organization
    { source: "/employer", destination: "/organization", permanent: true },
    // Organization root → dashboard
    { source: "/organization", destination: "/organization/dashboard", permanent: false },
    // Admin alias
    { source: "/admin/members", destination: "/admin/users", permanent: false },
  ];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for exact-match redirects
  for (const redirect of REDIRECTS) {
    if (pathname === redirect.source) {
      const url = request.nextUrl.clone();
      url.pathname = redirect.destination;
      return NextResponse.redirect(url, redirect.permanent ? 308 : 307);
    }
  }

  // Wildcard: /employer/* → /organization/*
  if (pathname.startsWith("/employer/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/employer/", "/organization/");
    return NextResponse.redirect(url, 308);
  }

  // Wildcard: /jobs/* → /careers/*
  if (pathname.startsWith("/jobs/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/jobs/", "/careers/");
    return NextResponse.redirect(url, 308);
  }

  // Wildcard: /jobs-training/* → /careers/*
  if (pathname.startsWith("/jobs-training/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/jobs-training/", "/careers/");
    return NextResponse.redirect(url, 308);
  }

  // Wildcard: /scholarships/* → /education/scholarships/*
  if (pathname.startsWith("/scholarships/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/scholarships/", "/education/scholarships/");
    return NextResponse.redirect(url, 308);
  }

  // Wildcard: /powwows/* → /community/*
  if (pathname.startsWith("/powwows/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/powwows/", "/community/");
    return NextResponse.redirect(url, 308);
  }

  // Wildcard: /vendor/* → /organization/shop/*
  if (pathname.startsWith("/vendor/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/vendor/", "/organization/shop/");
    return NextResponse.redirect(url, 308);
  }

  // NOTE: Auth guards for /admin, /member, /organization are handled client-side
  // by AuthProvider + route-level components. Firebase Auth uses IndexedDB (not cookies),
  // so server-side middleware cannot reliably check auth state.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
