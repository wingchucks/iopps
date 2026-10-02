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
// Later messages in a conversation ride along with the first unread one's email.
const CONVERSATION_WINDOW_MS = 15 * 60 * 1000;
// Each sender gets a bounded share of the Resend quota that password-reset and
// verification email also use. Retries of a counted message are never re-counted.
const SENDER_LIMITS = [{ max: 10, window: 60 * 60 * 1000 }, { max: 30, window: 24 * 60 * 60 * 1000 }];
const DEFAULT_TIME_ZONE = "America/Regina";
const SKIPPED = { state: "skipped", status: 200 } as const;

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function clockMinutes(value: unknown): number | null {
  const match = typeof value === "string" ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function minutesInZone(now: number, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const hour = Number(parts.find(part => part.type === "hour")?.value);
    const minute = Number(parts.find(part => part.type === "minute")?.value);
    return Number.isInteger(hour) && Number.isInteger(minute) ? (hour % 24) * 60 + minute : null;
  } catch { return null; }
}

// Quiet hours use the time zone saved with them, otherwise IOPPS's home time zone.
function quietHoursActive(quietHours: unknown, now: number): boolean {
  if (!quietHours || typeof quietHours !== "object") return false;
  const { enabled, start, end, timeZone } = quietHours as Record<string, unknown>;
  const from = clockMinutes(start), to = clockMinutes(end);
  if (enabled !== true || from === null || to === null || from === to) return false;
  const current = (typeof timeZone === "string" && timeZone ? minutesInZone(now, timeZone) : null) ?? minutesInZone(now, DEFAULT_TIME_ZONE);
  if (current === null) return false;
  return from < to ? current >= from && current < to : current >= from || current < to;
}

const isMissingAccount = (error: unknown) => (error as { code?: unknown } | null)?.code === "auth/user-not-found";

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
      const conversationWindow = db.doc(`message_notification_limits/conversation-${digest(`${recipientId}/${data.conversationId}`)}`);
      const senderQuota = db.doc(`message_notification_limits/sender-${digest(viewer.decodedToken.uid)}`);
      const [recipient, sender, queued, settings, privacy, claim, quota] = await tx.getAll(db.doc(`members/${recipientId}`), db.doc(`members/${viewer.decodedToken.uid}`), receipt, db.doc(`notification_preferences/${recipientId}`), db.doc(`member_settings/${recipientId}`), conversationWindow, senderQuota);
      const previous = queued.data();
      // Never change or replay historical extension queue records.
      if (queued.exists && previous?.managedBy !== MANAGED_BY) return { state: "legacy_queued", status: 200 } as const;
      if (previous?.status === "accepted") return { state: "accepted", status: 200 } as const;
      const createdAt = data.createdAt?.toMillis?.();
      if (!queued.exists && (!Number.isFinite(createdAt) || now - createdAt > NEW_MESSAGE_WINDOW_MS || createdAt > now + 60_000)) return { state: "expired", status: 200 } as const;
      if (previous && (!Number.isFinite(previous.firstAttemptAt) || now - previous.firstAttemptAt >= RETRY_WINDOW_MS)) return { state: "expired", status: 200 } as const;
      // Recipient choices apply to first attempts and retries alike; reasons stay private.
      const preferences = settings.data();
      if (preferences?.categories?.messages?.email === false || privacy.data()?.allowDirectMessages === false || quietHoursActive(preferences?.quietHours, now)) return SKIPPED;
      let identity;
      try { identity = await getAdminAuth().getUser(recipientId); }
      catch (error) { if (isMissingAccount(error)) return SKIPPED; throw error; } // Closed account: nothing to retry.
      if (!identity.emailVerified || !identity.email || identity.disabled) return SKIPPED;
      // Frozen payloads preserve provider idempotency; changed recipient email fails closed.
      if (previous && previous.to !== identity.email) return SKIPPED;
      if (previous?.leaseUntil > now) return { state: "busy", status: 200 } as const;
      let quotaWindows: { count: number; resetAt: number }[] = [];
      if (!queued.exists) {
        // Only the first unread message in a window emails; a failed claimant yields its window.
        const held = claim.data();
        if (held?.windowUntil > now && typeof held?.messageId === "string" && held.messageId !== messageId && !held.messageId.includes("/")) {
          const [claimant] = await tx.getAll(db.doc(`mail/message-${held.messageId}`));
          if (claimant.data()?.status !== "failed") return SKIPPED;
        }
        const counted = Array.isArray(quota.data()?.windows) ? quota.data()!.windows : [];
        quotaWindows = SENDER_LIMITS.map((limit, index) => {
          const active = Number(counted[index]?.resetAt) > now;
          return { count: active ? Number(counted[index].count) || 0 : 0, resetAt: active ? Number(counted[index].resetAt) : now + limit.window };
        });
        if (quotaWindows.some((state, index) => state.count >= SENDER_LIMITS[index].max)) return SKIPPED;
      }
      const name = String(sender.data()?.displayName || "An IOPPS member");
      const payload = previous ? { to: previous.to as string, subject: previous.message.subject as string, html: previous.message.html as string } : {
        to: identity.email,
        subject: `New message from ${name}`,
        // The template escapes both names; the email subject is plain text.
        html: newMessageEmail(String(recipient.data()?.displayName || "Member"), name),
      };
      const idempotencyKey = `message-${createHash("sha256").update(messageId).digest("hex")}`;
      if (queued.exists) tx.update(receipt, { leaseToken, leaseUntil: now + LEASE_MS, status: "sending" });
      else {
        tx.create(receipt, { managedBy: MANAGED_BY, to: payload.to, message: { subject: payload.subject, html: payload.html }, firstAttemptAt: now, createdAt: FieldValue.serverTimestamp(), leaseToken, leaseUntil: now + LEASE_MS, status: "sending" });
        tx.set(conversationWindow, { messageId, windowUntil: now + CONVERSATION_WINDOW_MS });
        tx.set(senderQuota, { windows: quotaWindows.map(state => ({ ...state, count: state.count + 1 })) });
      }
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
