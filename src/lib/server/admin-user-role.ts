import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { isSuperAdminEmail } from "./super-admin";

type RoleAuth = Pick<Auth, "getUser" | "setCustomUserClaims" | "revokeRefreshTokens">;
type RoleSource = Record<string, unknown> | null | undefined;

/** The platform role (admin or moderator) granted by any of these claims or account records. */
export function platformRoleOf(...sources: RoleSource[]): "admin" | "moderator" | null {
  if (sources.some(source => source?.admin === true || source?.role === "admin")) return "admin";
  return sources.some(source => source?.role === "moderator") ? "moderator" : null;
}

/**
 * Claims for an account that now owns organization `orgId`. Organization setup
 * adds a workspace: platform claims (admin, moderator and any other claim) are
 * kept and only stale organization links are replaced, because
 * setCustomUserClaims overwrites every claim it is not given.
 */
export function organizationOwnerClaims(current: RoleSource, orgId: string): Record<string, unknown> {
  const claims: Record<string, unknown> = { ...current };
  for (const key of ["orgId", "orgRole", "employer"]) delete claims[key];
  claims.employerId = orgId;
  if (!platformRoleOf(claims)) claims.role = "employer";
  return claims;
}

/** Keep role authority in signed claims; profile fields are only display mirrors. */
export async function changeAdminUserRole(
  uid: string,
  role: string,
  deps: { auth: RoleAuth; db: Pick<Firestore, "collection" | "runTransaction">; isSuperAdmin: boolean },
): Promise<void> {
  if (!deps.isSuperAdmin) throw new Error("Super admin access is required to change account roles");
  if (!["member", "community", "employer", "school", "organization", "moderator", "admin"].includes(role)) {
    throw new Error("Invalid user role");
  }
  const target = await deps.auth.getUser(uid);
  if (isSuperAdminEmail(target.email)) throw new Error("Cannot modify super admin account");
  const claims: Record<string, unknown> = { ...target.customClaims, role };
  if (role === "admin") claims.admin = true;
  else delete claims.admin;

  // The freshness marker blocks existing tokens before Auth changes begin. If
  // claim cleanup or revocation fails, the account remains blocked until a
  // later sign-in and the caller receives an error, never a false success.
  const userRef = deps.db.collection("users").doc(uid);
  const memberRef = deps.db.collection("members").doc(uid);
  await deps.db.runTransaction(async tx => {
    const member = await tx.get(memberRef);
    const updates = { role, updatedAt: new Date().toISOString(), claimsValidAfter: Math.floor(Date.now() / 1000) };
    tx.update(userRef, updates);
    if (member.exists) tx.update(memberRef, { role, updatedAt: updates.updatedAt });
  });
  await deps.auth.setCustomUserClaims(uid, claims);
  await deps.auth.revokeRefreshTokens(uid);
}
