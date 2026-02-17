import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/messages — list conversations for a user
export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("conversations")
    .where("participants", "array-contains", uid)
    .orderBy("lastMessageAt", "desc")
    .get();

  const conversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(conversations);
}

// POST /api/messages — create new conversation
export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participants, orgId, postId } = await req.json();
  if (!participants?.length || !orgId) {
    return NextResponse.json({ error: "participants and orgId required" }, { status: 400 });
  }

  // Check if conversation already exists between these participants for this org
  const existing = await adminDb
    .collection("conversations")
    .where("participants", "==", participants.sort())
    .where("orgId", "==", orgId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ id: existing.docs[0].id, ...existing.docs[0].data() });
  }

  const ref = await adminDb.collection("conversations").add({
    participants: participants.sort(),
    orgId,
    postId: postId ?? null,
    lastMessage: "",
    lastMessageAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
