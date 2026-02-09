import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Legacy URL redirects - maps old dashboard tabs to new routes
const TAB_REDIRECTS: Record<string, string> = {
  jobs: '/organization/hire/jobs',
  applications: '/organization/hire/applications',
  videos: '/organization/hire/interviews',
  school: '/organization/educate/profile',
  programs: '/organization/educate/programs',
  scholarships: '/organization/educate/scholarships',
  events: '/organization/host/events',
  'student-inquiries': '/organization/educate/inquiries',
  products: '/organization/sell/offerings',
  services: '/organization/sell/offerings',
  'shop-inquiries': '/organization/inbox?filter=customers',
  funding: '/organization/funding/opportunities',
  messages: '/organization/inbox',
  billing: '/organization/billing',
  profile: '/organization/settings',
  team: '/organization/team',
};

// Mode-based redirects
const MODE_REDIRECTS: Record<string, string> = {
  vendor: '/organization/sell/profile',
  employer: '/organization/hire/jobs',
};

// Standalone page redirects
const PAGE_REDIRECTS: Record<string, string> = {
  '/organization/subscription': '/organization/billing',
  '/organization/shop/dashboard': '/organization/sell/profile',
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // Handle legacy /business/[slug] → /organizations/[slug] redirect
  const businessMatch = path.match(/^\/business\/([^/]+)$/);
  if (businessMatch) {
    const slug = businessMatch[1];
    const redirectUrl = new URL(`/organizations/${slug}`, request.url);
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Handle legacy dashboard tab redirects
  if (path === '/organization/dashboard') {
    const tab = searchParams.get('tab');
    const mode = searchParams.get('mode');

    // Tab-based redirect takes priority
    if (tab && TAB_REDIRECTS[tab]) {
      const redirectUrl = new URL(TAB_REDIRECTS[tab], request.url);
      return NextResponse.redirect(redirectUrl, { status: 301 });
    }

    // Mode-based redirect
    if (mode && MODE_REDIRECTS[mode]) {
      const redirectUrl = new URL(MODE_REDIRECTS[mode], request.url);
      return NextResponse.redirect(redirectUrl, { status: 301 });
    }

    // No tab/mode specified - continue to the dashboard page
    return NextResponse.next();
  }

  // Handle standalone page redirects
  if (PAGE_REDIRECTS[path]) {
    const redirectUrl = new URL(PAGE_REDIRECTS[path], request.url);
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Protected routes checks (placeholder - actual auth happens client-side)
  // Note: Client-side SDK handles auth state via onAuthStateChanged.
  // Real protection happens in Firestore Rules (backend) and Components (client-side redirects).

  return NextResponse.next();
}

export const config = {
    matcher: [
        '/organization/:path*',
        '/member/:path*',
        '/business/:path*',
        // V2 routes
        '/get-started',
        '/home',
        '/org/:path*',
        '/admin/:path*',
        '/me/:path*',
    ],
};
