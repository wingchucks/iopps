import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { isSuperAdminEmail } from "./super-admin";

type RoleAuth = Pick<Auth, "getUser" | "setCustomUserClaims" | "revokeRefreshTokens">;

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
