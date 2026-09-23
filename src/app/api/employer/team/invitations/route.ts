import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { createTeamInvitation, revokeTeamInvitation, TeamInvitationError } from "@/lib/server/team-invitations";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
function failure(error: unknown) {
  const known = error instanceof EmployerApiError || error instanceof TeamInvitationError;
  return NextResponse.json({ error: known ? error.message : "Unable to manage invitations. Please try again." }, { status: known ? error.status : 503, headers });
}
async function owner(request: NextRequest) {
  const context = await requireEmployerContext(request);
  if (context.orgRole !== "owner") throw new EmployerApiError(403, "Organization owner access required");
  return context;
}
export async function GET(request: NextRequest) {
  try {
    const context = await owner(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor && !/^[a-f0-9]{64}$/.test(cursor)) throw new TeamInvitationError("Invalid invitation page");
    let query = getAdminDb().collection("team_invitations_v1").where("orgId", "==", context.orgId).orderBy("__name__");
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.limit(101).get();
    const page = snapshot.docs.slice(0, 100);
    return NextResponse.json({ nextCursor: snapshot.docs.length > 100 ? page[page.length - 1].id : null, invitations: page.map(doc => { const d = doc.data(); return { id: doc.id, email: d.email, role: d.role, state: d.state === "pending" && d.expiresAt <= Date.now() ? "expired" : d.state, expiresAt: d.expiresAt }; }) }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const context = await owner(request), body = await request.json();
    if (!body || Object.keys(body).some(key => !["email", "role"].includes(key))) throw new TeamInvitationError("Invalid invitation fields");
    const invitation = await createTeamInvitation(context, body, { db: getAdminDb(), auth: getAdminAuth() });
    return NextResponse.json({ id: invitation.id, path: `/team/invitations/accept#${invitation.token}`, expiresAt: invitation.expiresAt, emailSent: false }, { status: 201, headers });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const context = await owner(request), body = await request.json();
    if (!body || typeof body.id !== "string" || Object.keys(body).some(key => key !== "id")) throw new TeamInvitationError("Invalid invitation");
    await revokeTeamInvitation(context, body.id, { db: getAdminDb(), auth: getAdminAuth() });
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return failure(error); }
}
