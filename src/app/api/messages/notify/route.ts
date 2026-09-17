import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { newMessageEmail } from "@/lib/email-templates";

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function POST(request: NextRequest) {
  const viewer = await verifyAuthToken(request);
  if (!viewer.success) return viewer.response;
  try {
    const { messageId } = await request.json();
    if (typeof messageId !== "string" || !messageId || messageId.includes("/") || messageId.length > 500) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const db = getAdminDb();
    const result = await db.runTransaction(async tx => {
      const message = await tx.get(db.doc(`messages/${messageId}`));
      const data = message.data();
      if (!data || data.senderId !== viewer.decodedToken.uid || typeof data.conversationId !== "string" || data.conversationId.includes("/")) return 404;
      const conversation = await tx.get(db.doc(`conversations/${data.conversationId}`));
      const participants = conversation.data()?.participants;
      if (!Array.isArray(participants) || participants.length !== 2 || !participants.includes(viewer.decodedToken.uid)) return 403;
      const recipientId = participants.find(id => id !== viewer.decodedToken.uid);
      if (typeof recipientId !== "string" || recipientId.includes("/")) return 403;
      const receipt = db.doc(`mail/message-${messageId}`);
      const [recipient, sender, queued, settings] = await tx.getAll(db.doc(`members/${recipientId}`), db.doc(`members/${viewer.decodedToken.uid}`), receipt, db.doc(`notification_preferences/${recipientId}`));
      const recipientIdentity = await getAdminAuth().getUser(recipientId);
      if (!queued.exists && recipientIdentity.emailVerified && recipientIdentity.email && !recipientIdentity.disabled && settings.data()?.categories?.messages?.email !== false) {
        const name = String(sender.data()?.displayName || "An IOPPS member");
        tx.create(receipt, { to: recipientIdentity.email, status: "pending", createdAt: FieldValue.serverTimestamp(), message: { subject: `New message from ${name}`, html: newMessageEmail(escape(String(recipient.data()?.displayName || "Member")), escape(name)) } });
      }
      return 200;
    });
    return NextResponse.json(result === 200 ? { success: true } : { error: "Message not available" }, { status: result });
  } catch { return NextResponse.json({ error: "Unable to queue notification" }, { status: 503 }); }
}
