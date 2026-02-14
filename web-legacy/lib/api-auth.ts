import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthResult {
  success: true;
  decodedToken: DecodedIdToken;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the decoded token on success, or a NextResponse error on failure.
 */
export async function verifyAuthToken(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!auth) {
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
    const decodedToken = await auth.verifyIdToken(token);
    return { success: true, decodedToken };
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

/**
 * Verify that the request is from an admin user.
 * Returns the decoded token on success, or a NextResponse error on failure.
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
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}
