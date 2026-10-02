import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { isSuperAdminAccount } from "@/lib/server/super-admin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const ORGANIZATION_ROLES = ["employer", "school", "organization"];

/** Removal clears organization fields only; a platform role (admin, moderator, community) is not the organization's to change. */
function removalUpdates(data: Record<string, unknown> | undefined) {
  return {
    orgId: FieldValue.delete(), employerId: FieldValue.delete(), orgRole: FieldValue.delete(), orgName: FieldValue.delete(),
    ...(ORGANIZATION_ROLES.includes(String(data?.role)) ? { role: "community" } : {}),
  };
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof EmployerApiError ? error.message : "Unable to update team" }, { status: error instanceof EmployerApiError ? error.status : 503, headers });
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireEmployerContext(request);
    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "Team manager access required");
    const snapshot = await getAdminDb().collection("members").where("orgId", "==", context.orgId).get();
    const members = snapshot.docs.map(doc => {
      const data = doc.data();
      return { uid: doc.id, displayName: data.displayName || "Member", photoURL: data.photoURL || null, email: data.email || "", orgRole: data.orgRole || "member" };
    });
    return NextResponse.json({ members }, { headers });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireEmployerContext(request);
    if (context.orgRole !== "owner") throw new EmployerApiError(403, "Organization owner access required");
    const body = await request.json();
    if (typeof body.uid !== "string" || !body.uid || body.uid.includes("/") || !["admin", "member", "remove"].includes(body.role)) throw new EmployerApiError(400, "Invalid team update");
    const auth = getAdminAuth();
    if (body.uid === context.uid || await isSuperAdminAccount(body.uid, auth)) throw new EmployerApiError(403, "Cannot change this account");
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const memberRef = db.doc(`members/${body.uid}`), userRef = db.doc(`users/${body.uid}`);
      const [member, user] = await tx.getAll(memberRef, userRef);
      if (!member.exists || member.data()?.orgId !== context.orgId) throw new EmployerApiError(404, "Team member not found");
      if (member.data()?.orgRole === "owner") throw new EmployerApiError(403, "Cannot change an organization owner");
      if (body.role === "remove") {
        tx.update(memberRef, removalUpdates(member.data()));
        if (user.exists) tx.update(userRef, removalUpdates(user.data()));
      } else {
        tx.update(memberRef, { orgRole: body.role });
        if (user.exists) tx.update(userRef, { orgRole: body.role });
      }
    });
    if (body.role === "remove") {
      const record = await auth.getUser(body.uid);
      const claims = { ...record.customClaims };
      for (const key of ["orgId", "orgRole", "employerId", "employer"]) delete claims[key];
      if (ORGANIZATION_ROLES.includes(claims.role)) delete claims.role;
      await auth.setCustomUserClaims(body.uid, claims);
      await auth.revokeRefreshTokens(body.uid);
    }
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return failure(error); }
}
