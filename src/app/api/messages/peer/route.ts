import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const validId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 500 && !value.includes("/");

// Historical conversations could be created unilaterally. Participation permits
// existing messaging, not disclosure of current identity. Client-editable trust
// or projection fields cannot establish provenance; never read a peer profile.
export async function GET(request: NextRequest) {
  const viewer = await verifyAuthToken(request);
  if (!viewer.success) return viewer.response;
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!validId(conversationId)) return NextResponse.json({ error: "Invalid conversation" }, { status: 400, headers });
  try {
    const db = getAdminDb();
    const conversation = await db.doc(`conversations/${conversationId}`).get();
    const participants = conversation.data()?.participants;
    if (!Array.isArray(participants) || participants.length !== 2 ||
        !participants.every(validId) || participants[0] === participants[1] ||
        !participants.includes(viewer.decodedToken.uid)) {
      return NextResponse.json({ error: "Conversation not available" }, { status: 404, headers });
    }
    const uid = participants.find(id => id !== viewer.decodedToken.uid)!;
    return NextResponse.json({ peer: { uid, displayName: "IOPPS member" } }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to load conversation" }, { status: 503, headers });
  }
}
