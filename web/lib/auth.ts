import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = "community" | "employer" | "moderator" | "admin";

export interface AuthSuccess {
  success: true;
  decodedToken: DecodedIdToken;
}

export interface AuthFailure {
  success: false;
  response: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the Bearer token from the Authorization header of a Request.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify the Firebase ID token attached to an incoming request.
 *
 * Usage in API routes:
 * ```ts
 * const result = await verifyIdToken(request);
 * if (!result.success) return result.response;
 * const { uid } = result.decodedToken;
 * ```
 */
export async function verifyIdToken(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request);

  if (!token) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!adminAuth) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      ),
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { success: true, decodedToken };
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

/**
 * Verify the Firebase ID token **and** require the `admin` role.
 *
 * Checks both the custom claim `admin: true` and `role: "admin"` on the token.
 */
export async function verifyAdminToken(request: Request): Promise<AuthResult> {
  const result = await verifyIdToken(request);
  if (!result.success) return result;

  const { decodedToken } = result;
  const isAdmin =
    decodedToken.admin === true || decodedToken.role === "admin";

  if (!isAdmin) {
    return {
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

/**
 * Verify that the request carries the correct CRON_SECRET.
 *
 * Expected header: `Authorization: Bearer <CRON_SECRET>`
 */
export function verifyCronSecret(request: Request): AuthResult {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      ),
    };
  }

  const token = extractBearerToken(request);

  if (token !== secret) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Return a minimal decoded-token-shaped object so callers can use the same
  // AuthResult type uniformly. The UID "cron" signals an automated caller.
  return {
    success: true,
    decodedToken: { uid: "cron" } as DecodedIdToken,
  };
}
