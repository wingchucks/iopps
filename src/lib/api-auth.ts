import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: true;
  decodedToken: DecodedIdToken;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

/**
 * Verify the Firebase ID token from the Authorization header.
 *
 * Extracts the Bearer token from the request, validates it against
 * Firebase Admin Auth, and returns the decoded token on success.
 */
export async function verifyAuthToken(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
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
    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { success: true, decodedToken };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Admin-only verification
// ---------------------------------------------------------------------------

/**
 * Verify the Firebase ID token **and** require admin privileges.
 *
 * Checks both the custom claim `admin: true` and `role: "admin"` on the
 * decoded token to support both legacy and current claim structures.
 */
export async function verifyAdminToken(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  const result = await verifyAuthToken(request);
  if (!result.success) return result;

  const { decodedToken } = result;
  const isAdmin =
    decodedToken.admin === true || decodedToken.role === "admin";

  if (!isAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return result;
}
