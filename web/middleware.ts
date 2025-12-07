import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define protected routes
    const isEmployerRoute = path.startsWith('/organization');
    const isMemberRoute = path.startsWith('/member');

    // Check for session cookie (Firebase Auth cookie)
    // Note: Client-side SDK handles auth state, but middleware can check for a session cookie 
    // if you implement server-side session management. 
    // Without server-side sessions, middleware can't verify auth state easily.
    // Assuming we use a cookie named 'session' or similar from a custom auth flow, or just relying on client-side checks for now.
    // NEXT.JS MIDDLEWARE LIMITATION: Cannot verify Firebase ID Token directly without edge-compatible library or cookie.

    // STRATEGY: 
    // Since we are likely using client-side auth (onAuthStateChanged), 
    // this middleware is a placeholder or "soft" check. 
    // Real protection happens in Firestore Rules (backend) and Components (client-side redirects).

    // However, we can check for a 'token' cookie if your app sets one. 
    // If no cookie mechanism exists yet, this middleware might be limited.

    // For now, let's just log or pass through until creating a full session cookie handler.
    // If we want to strictly protect, we'd need to set a cookie on login.

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/organization/:path*',
        '/member/:path*',
    ],
};
