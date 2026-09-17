import type { Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";

// This is an ownership policy, not a configurable list of administrators.
export const SUPER_ADMIN_EMAIL = "nathan.arias@iopps.ca";

export function isSuperAdminEmail(email: unknown): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

function hasAdminClaim(claims: Record<string, unknown> | undefined): boolean {
  return claims?.admin === true || claims?.role === "admin";
}

export function isSuperAdminIdentity(
  token: Pick<DecodedIdToken, "uid" | "email" | "email_verified"> & Record<string, unknown>,
  authUser: Pick<UserRecord, "uid" | "email" | "emailVerified" | "disabled" | "customClaims"> | null,
): boolean {
  // Check the signed identity and the current Auth record. Profile fields and
  // stale claims must never grant ownership privileges.
  return Boolean(
    authUser &&
      authUser.uid === token.uid &&
      !authUser.disabled &&
      isSuperAdminEmail(token.email) &&
      isSuperAdminEmail(authUser.email) &&
      token.email_verified === true &&
      authUser.emailVerified === true &&
      hasAdminClaim(token) &&
      hasAdminClaim(authUser.customClaims),
  );
}

/** Protect the owner's Auth account even if its editable profile email changes. */
export async function isSuperAdminAccount(
  uid: string,
  auth: Pick<Auth, "getUser">,
): Promise<boolean> {
  try {
    return isSuperAdminEmail((await auth.getUser(uid)).email);
  } catch (error) {
    if (
      typeof error === "object" && error !== null && "code" in error &&
      error.code === "auth/user-not-found"
    ) return false;
    throw error;
  }
}
