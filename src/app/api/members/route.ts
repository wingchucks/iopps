import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { visibleMemberProfile } from "@/lib/server/member-privacy";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const viewer = await verifyAuthToken(request);
  if (!viewer.success) return viewer.response;
  const uid = request.nextUrl.searchParams.get("uid");
  const cursor = request.nextUrl.searchParams.get("cursor");
  if ([uid, cursor].some(value => value !== null && (!value || value.includes("/") || value.length > 128))) {
    return NextResponse.json({ error: "Invalid member identifier" }, { status: 400, headers });
  }
  try {
    const db = getAdminDb();
    if (uid) {
      const [member, settings, account] = await db.getAll(db.doc(`members/${uid}`), db.doc(`member_settings/${uid}`), db.doc(`users/${uid}`));
      const profile = member.exists ? visibleMemberProfile(uid, member.data()!, settings.data() ?? {}, account.data() ?? {}, true) : null;
      return NextResponse.json({ member: profile }, { headers });
    }
    let query = db.collection("members").orderBy(FieldPath.documentId()).limit(40);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const members = await Promise.all(snapshot.docs.map(async member => {
      const [settings, account] = await db.getAll(db.doc(`member_settings/${member.id}`), db.doc(`users/${member.id}`));
      return visibleMemberProfile(member.id, member.data(), settings.data() ?? {}, account.data() ?? {}, true, true);
    }));
    return NextResponse.json({ members: members.filter(member => member?.displayName), nextCursor: snapshot.size === 40 ? snapshot.docs.at(-1)!.id : null }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to load members" }, { status: 503, headers });
  }
}
