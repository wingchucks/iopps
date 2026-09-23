import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { acceptTeamInvitation, TeamInvitationError } from "@/lib/server/team-invitations";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request, { checkRevoked: true });
    if (!auth.success) { Object.entries(headers).forEach(([key, value]) => auth.response.headers.set(key, value)); return auth.response; }
    if (auth.isSuperAdmin) throw new TeamInvitationError("Protected accounts cannot accept organization invitations", 403);
    const body = await request.json();
    if (!body || body.confirm !== true || typeof body.token !== "string" || Object.keys(body).some(key => !["token", "confirm"].includes(key))) throw new TeamInvitationError("Confirm that you want to join this organization");
    const result = await acceptTeamInvitation(auth.decodedToken.uid, body.token, { db: getAdminDb(), auth: getAdminAuth() });
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    const known = error instanceof TeamInvitationError;
    return NextResponse.json({ error: known ? error.message : "Unable to accept this invitation. Please try again." }, { status: known ? error.status : 503, headers });
  }
}
