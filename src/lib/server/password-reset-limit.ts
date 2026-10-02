import { createHash } from "node:crypto";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";

/**
 * send: deliver a link. suppress: answer exactly as for any other address but
 * send nothing, so the per-address limit never reveals or blocks an account.
 * rate_limited: the caller's own network is over its limit.
 */
export type PasswordResetReservation = "send" | "suppress" | "rate_limited";

// Rolling per-address window no longer than a Firebase reset link stays valid
// (one hour). A suppressed request therefore always follows a still-usable link
// in the owner's inbox, and requests made by someone else cannot lock the owner
// out of recovery for a day. Only sends enter the window, never suppressed
// requests, so repeated requests cannot extend it.
const EMAIL_LIMIT = { max: 3, window: 60 * 60 * 1000 };
// Every attempt, sent or suppressed, spends the requesting network's quota.
const IP_LIMIT = { max: 10, window: 30 * 60 * 1000 };

function limitRef(db: Firestore, kind: "email" | "ip", value: string): DocumentReference {
  return db.collection("password_reset_limits").doc(`${kind}-${createHash("sha256").update(value).digest("hex")}`);
}

export async function reservePasswordReset(db: Firestore, email: string, clientIp: string, now = Date.now()): Promise<PasswordResetReservation> {
  const emailRef = limitRef(db, "email", email.toLowerCase());
  const ipRef = limitRef(db, "ip", clientIp);
  return db.runTransaction(async tx => {
    const [emailDoc, ipDoc] = await tx.getAll(emailRef, ipRef);
    const ipData = ipDoc.data();
    const ip = ipData?.resetAt > now
      ? { count: Number(ipData?.count) || 0, resetAt: ipData!.resetAt }
      : { count: 0, resetAt: now + IP_LIMIT.window };
    if (ip.count >= IP_LIMIT.max) return "rate_limited";
    tx.set(ipRef, { ...ip, count: ip.count + 1 });

    const stored = emailDoc.data()?.sentAt;
    const sentAt = (Array.isArray(stored) ? stored : [])
      .filter((value): value is number => typeof value === "number" && value > now - EMAIL_LIMIT.window);
    if (sentAt.length >= EMAIL_LIMIT.max) return "suppress";
    sentAt.push(now);
    tx.set(emailRef, { sentAt, count: sentAt.length, resetAt: Math.min(...sentAt) + EMAIL_LIMIT.window });
    return "send";
  });
}
