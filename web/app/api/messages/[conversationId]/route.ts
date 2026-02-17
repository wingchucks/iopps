import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/messages/:conversationId — get messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is participant
  const convo = await adminDb.collection("conversations").doc(conversationId).get();
  if (!convo.exists || !convo.data()?.participants?.includes(uid)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snap = await adminDb
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(messages);
}

// POST /api/messages/:conversationId — send message
export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, attachments } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  // Verify participant
  const convo = await adminDb.collection("conversations").doc(conversationId).get();
  if (!convo.exists || !convo.data()?.participants?.includes(uid)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ref = await adminDb
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .add({
      conversationId,
      senderUid: uid,
      text: text.trim(),
      attachments: attachments ?? [],
      readBy: [uid],
      createdAt: FieldValue.serverTimestamp(),
    });

  // Update conversation last message
  await adminDb.collection("conversations").doc(conversationId).update({
    lastMessage: text.trim().slice(0, 100),
    lastMessageAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
