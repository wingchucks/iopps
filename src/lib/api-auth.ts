import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { AccountAccessDeps } from "@/lib/server/account-access";
import { assertUserCanAccessApp, AccountAccessError } from "@/lib/server/account-access";
import { isSuperAdminEmail } from "@/lib/server/super-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: true;
  decodedToken: DecodedIdToken;
  userData: Record<string, unknown>;
  viewerEmail: string | null;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

export interface VerifyAuthTokenDeps {
  adminAuth?: Pick<Auth, "verifyIdToken"> | null;
  accessDeps?: AccountAccessDeps;
  superAdminEnvValue?: string | null;
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
  request: NextRequest,
  deps: VerifyAuthTokenDeps = {},
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

  const authService = deps.adminAuth ?? adminAuth;

  if (!authService) {
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
    const decodedToken = await authService.verifyIdToken(token);
    const access = await assertUserCanAccessApp(decodedToken, deps.accessDeps);
    return {
      success: true,
      decodedToken,
      userData: access.userData,
      viewerEmail: access.email,
    };
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return {
        success: false,
        response: NextResponse.json(
          { error: error.message },
          { status: error.status }
        ),
      };
    }

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
  request: NextRequest,
  deps: VerifyAuthTokenDeps = {},
): Promise<AuthResult | AuthError> {
  const result = await verifyAuthToken(request, deps);
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

export async function verifySuperAdminToken(
  request: NextRequest,
  deps: VerifyAuthTokenDeps = {},
): Promise<AuthResult | AuthError> {
  const result = await verifyAdminToken(request, deps);
  if (!result.success) return result;

  const viewerEmail = result.viewerEmail ?? result.decodedToken.email ?? null;
  if (!isSuperAdminEmail(viewerEmail, deps.superAdminEnvValue ?? undefined)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      ),
    };
  }

  return result;
}
