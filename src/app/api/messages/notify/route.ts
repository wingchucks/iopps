import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { newMessageEmail } from "@/lib/email-templates";
import { sendMessageNotification } from "@/lib/email";
import { createHash, randomUUID } from "node:crypto";

const MANAGED_BY = "message-resend-v1";
const LEASE_MS = 120_000;
// Resend caches keys for 24 hours. Stop retries before the provider cache expires.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const NEW_MESSAGE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const viewer = await verifyAuthToken(request);
  if (!viewer.success) return viewer.response;
  try {
    const { messageId } = await request.json();
    if (typeof messageId !== "string" || !messageId || messageId.includes("/") || messageId.length > 500) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const db = getAdminDb();
    const receipt = db.doc(`mail/message-${messageId}`);
    const leaseToken = randomUUID();
    const now = Date.now();
    const result = await db.runTransaction(async tx => {
      const message = await tx.get(db.doc(`messages/${messageId}`));
      const data = message.data();
      if (!data || data.senderId !== viewer.decodedToken.uid || typeof data.conversationId !== "string" || data.conversationId.includes("/")) return { state: "unavailable", status: 404 } as const;
      const conversation = await tx.get(db.doc(`conversations/${data.conversationId}`));
      const participants = conversation.data()?.participants;
      if (!Array.isArray(participants) || participants.length !== 2 || !participants.includes(viewer.decodedToken.uid)) return { state: "unavailable", status: 403 } as const;
      const recipientId = participants.find(id => id !== viewer.decodedToken.uid);
      if (typeof recipientId !== "string" || !recipientId || recipientId.includes("/")) return { state: "unavailable", status: 403 } as const;
      const [recipient, sender, queued, settings] = await tx.getAll(db.doc(`members/${recipientId}`), db.doc(`members/${viewer.decodedToken.uid}`), receipt, db.doc(`notification_preferences/${recipientId}`));
      const previous = queued.data();
      // Never change or replay historical extension queue records.
      if (queued.exists && previous?.managedBy !== MANAGED_BY) return { state: "legacy_queued", status: 200 } as const;
      if (previous?.status === "accepted") return { state: "accepted", status: 200 } as const;
      const createdAt = data.createdAt?.toMillis?.();
      if (!queued.exists && (!Number.isFinite(createdAt) || now - createdAt > NEW_MESSAGE_WINDOW_MS || createdAt > now + 60_000)) return { state: "expired", status: 200 } as const;
      if (previous && (!Number.isFinite(previous.firstAttemptAt) || now - previous.firstAttemptAt >= RETRY_WINDOW_MS)) return { state: "expired", status: 200 } as const;
      const identity = await getAdminAuth().getUser(recipientId);
      if (!identity.emailVerified || !identity.email || identity.disabled || settings.data()?.categories?.messages?.email === false) return { state: "skipped", status: 200 } as const;
      // Frozen payloads preserve provider idempotency; changed recipient email fails closed.
      if (previous && previous.to !== identity.email) return { state: "skipped", status: 200 } as const;
      if (previous?.leaseUntil > now) return { state: "busy", status: 200 } as const;
      const name = String(sender.data()?.displayName || "An IOPPS member");
      const payload = previous ? { to: previous.to as string, subject: previous.message.subject as string, html: previous.message.html as string } : {
        to: identity.email,
        subject: `New message from ${name}`,
        // The template escapes both names; the email subject is plain text.
        html: newMessageEmail(String(recipient.data()?.displayName || "Member"), name),
      };
      const idempotencyKey = `message-${createHash("sha256").update(messageId).digest("hex")}`;
      if (queued.exists) tx.update(receipt, { leaseToken, leaseUntil: now + LEASE_MS, status: "sending" });
      else tx.create(receipt, { managedBy: MANAGED_BY, to: payload.to, message: { subject: payload.subject, html: payload.html }, firstAttemptAt: now, createdAt: FieldValue.serverTimestamp(), leaseToken, leaseUntil: now + LEASE_MS, status: "sending" });
      return { state: "claimed", status: 200, payload, idempotencyKey } as const;
    });
    if (result.state !== "claimed") return NextResponse.json(result.status === 200 ? { success: true, notification: result.state } : { error: "Message not available" }, { status: result.status });
    let provider;
    try {
      provider = await sendMessageNotification(result.payload, result.idempotencyKey);
    } catch {
      await db.runTransaction(async tx => {
        const current = await tx.get(receipt);
        if (current.data()?.leaseToken === leaseToken && current.data()?.status !== "accepted") tx.update(receipt, { status: "failed", leaseUntil: 0, failedAt: FieldValue.serverTimestamp() });
      });
      return NextResponse.json({ error: "Notification provider did not confirm acceptance" }, { status: 503 });
    }
    // Receipt-write failure leaves the payload/lease intact; retry uses the same key.
    await db.runTransaction(async tx => {
      const current = await tx.get(receipt);
      if (current.data()?.leaseToken === leaseToken) tx.update(receipt, { status: "accepted", providerId: provider.id, acceptedAt: FieldValue.serverTimestamp(), leaseUntil: 0 });
    });
    return NextResponse.json({ success: true, notification: "accepted" });
  } catch { return NextResponse.json({ error: "Unable to confirm notification acceptance" }, { status: 503 }); }
}
