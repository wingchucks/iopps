import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware placeholder
 *
 * This middleware will handle:
 * - Authentication redirects (protect /member/*, /organization/*, /admin/*)
 * - Role-based access control
 * - Legacy URL redirects
 * - Rate limiting headers
 */
export function middleware(request: NextRequest) {
  // TODO: Implement authentication and route protection
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
