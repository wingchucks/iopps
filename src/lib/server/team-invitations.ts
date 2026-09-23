import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import type { Auth, UserRecord } from "firebase-admin/auth";

type Data = Record<string, unknown>;
type Owner = { uid: string; orgId: string; employerId: string; orgRole: string };
type Dependencies = { db: Firestore; auth: Pick<Auth, "getUser">; now?: () => number };
export class TeamInvitationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function fail(message: string, status = 400): never { throw new TeamInvitationError(message, status); }
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const collection = "team_invitations_v1";
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
function active(data: Data | undefined) {
  return Boolean(data) && data!.disabled !== true && data!.deleted !== true && data!.deletedAt == null && !["disabled", "deleted", "suspended", "archived"].includes(text(data!.status).toLowerCase());
}
function requireOwner(owner: Owner) {
  if (owner.orgRole !== "owner") fail("Organization owner access required", 403);
  for (const id of [owner.uid, owner.orgId, owner.employerId]) if (!id || id.includes("/")) fail("Invalid organization identity");
}
async function currentOwner(tx: Transaction, owner: Owner, db: Firestore) {
  requireOwner(owner);
  const [user, member, org, employer] = await tx.getAll(db.doc(`users/${owner.uid}`), db.doc(`members/${owner.uid}`), db.doc(`organizations/${owner.orgId}`), db.doc(`employers/${owner.employerId}`));
  const u = user.data(), m = member.data();
  if (!active(u) || (member.exists && !active(m)) || !org.exists || !active(org.data()) || (employer.exists && !active(employer.data()))) fail("Organization access is no longer available", 403);
  const role = text(m?.orgRole) || text(u?.orgRole) || (owner.uid === owner.orgId || owner.uid === owner.employerId ? "owner" : "member");
  if (role !== "owner") fail("Organization owner access required", 403);
  const linked = text(m?.orgId) || text(u?.orgId) || text(u?.employerId) || owner.uid;
  if (linked !== owner.orgId) fail("Organization access changed", 403);
  return org.data()!;
}
function usableAuth(record: UserRecord | undefined) {
  if (!record || record.disabled) fail("Account access is unavailable", 403);
}
export async function createTeamInvitation(owner: Owner, input: { email?: unknown; role?: unknown }, deps: Dependencies) {
  requireOwner(owner);
  const email = text(input.email).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["member", "admin"].includes(String(input.role))) fail("Enter a valid email and choose Member or Admin");
  usableAuth(await deps.auth.getUser(owner.uid));
  const id = digest(owner.orgId + "\0" + email), token = id + "." + randomBytes(32).toString("base64url");
  const createdAt = (deps.now || Date.now)(), expiresAt = createdAt + 7 * 24 * 60 * 60 * 1000;
  await deps.db.runTransaction(async tx => {
    await currentOwner(tx, owner, deps.db);
    // One current invitation per recipient/org. Regeneration invalidates old links.
    tx.set(deps.db.doc(`${collection}/${id}`), { orgId: owner.orgId, employerId: owner.employerId, createdBy: owner.uid, email, role: input.role, state: "pending", tokenHash: digest(token), createdAt, expiresAt });
  });
  return { id, token, email, role: input.role, expiresAt };
}
export async function revokeTeamInvitation(owner: Owner, id: string, deps: Dependencies) {
  requireOwner(owner);
  if (!/^[a-f0-9]{64}$/.test(id)) fail("Invalid invitation");
  usableAuth(await deps.auth.getUser(owner.uid));
  await deps.db.runTransaction(async tx => {
    await currentOwner(tx, owner, deps.db);
    const ref = deps.db.doc(`${collection}/${id}`), snapshot = await tx.get(ref), invite = snapshot.data();
    if (!invite || invite.orgId !== owner.orgId) fail("Invitation not found", 404);
    if (invite.state !== "pending") fail("This invitation is no longer pending", 409);
    tx.update(ref, { state: "revoked", revokedAt: (deps.now || Date.now)(), revokedBy: owner.uid });
  });
}
export async function acceptTeamInvitation(uid: string, token: string, deps: Dependencies) {
  if (!uid || uid.includes("/") || !/^[a-f0-9]{64}\.[A-Za-z0-9_-]{43}$/.test(token)) fail("Invalid invitation");
  const recipient = await deps.auth.getUser(uid); usableAuth(recipient);
  if (!recipient.emailVerified || !recipient.email) fail("Sign in with the invited email and verify it first", 403);
  const ref = deps.db.doc(`${collection}/${token.split(".")[0]}`);
  return deps.db.runTransaction(async tx => {
    const snapshot = await tx.get(ref), invite = snapshot.data();
    const supplied = Buffer.from(digest(token), "hex"), stored = Buffer.from(text(invite?.tokenHash), "hex");
    if (!invite || stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) fail("Invalid invitation", 404);
    if (invite.state !== "pending" || typeof invite.expiresAt !== "number" || invite.expiresAt <= (deps.now || Date.now)()) fail("This invitation has expired or is no longer available", 409);
    if (recipient.email!.toLowerCase() !== invite.email || !["member", "admin"].includes(invite.role)) fail("Sign in with the invited email", 403);
    const owner = { uid: invite.createdBy, orgId: invite.orgId, employerId: invite.employerId, orgRole: "owner" };
    usableAuth(await deps.auth.getUser(owner.uid));
    const org = await currentOwner(tx, owner, deps.db);
    const userRef = deps.db.doc(`users/${uid}`), memberRef = deps.db.doc(`members/${uid}`);
    const [user, member] = await tx.getAll(userRef, memberRef);
    if (!user.exists || !active(user.data()) || (member.exists && !active(member.data()))) fail("Account access is unavailable", 403);
    for (const data of [user.data()!, member.data() || {}, recipient.customClaims || {}]) {
      if (["admin", "moderator", "super_admin", "superadmin", "employer", "school", "organization"].includes(text(data.role)) || data.admin === true || data.superAdmin === true || text(data.orgRole)) fail("This account already has protected or organization access", 409);
      for (const key of ["orgId", "employerId", "organizationId"]) if (text(data[key])) fail("This account already belongs to an organization", 409);
    }
    // Preserve account/platform role, profile content, claims and all organization fields.
    tx.set(userRef, { orgId: invite.orgId, employerId: invite.employerId, orgRole: invite.role }, { merge: true });
    tx.set(memberRef, { orgId: invite.orgId, orgRole: invite.role }, { merge: true });
    tx.update(ref, { state: "accepted", acceptedAt: (deps.now || Date.now)(), acceptedBy: uid });
    return { orgId: invite.orgId, name: text(org.name) || "your organization" };
  });
}
