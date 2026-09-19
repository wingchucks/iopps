import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

export async function reservePasswordReset(db: Firestore, email: string, clientIp: string, now = Date.now()): Promise<boolean> {
  const limits = [{ kind: "email", value: email.toLowerCase(), max: 3, window: 86400000 }, { kind: "ip", value: clientIp, max: 10, window: 1800000 }];
  return db.runTransaction(async tx => {
    const refs = limits.map(limit => db.collection("password_reset_limits").doc(`${limit.kind}-${createHash("sha256").update(limit.value).digest("hex")}`));
    const docs = await tx.getAll(...refs);
    const states = docs.map((doc, index) => ({ count: doc.data()?.resetAt > now ? Number(doc.data()?.count) || 0 : 0, resetAt: doc.data()?.resetAt > now ? doc.data()!.resetAt : now + limits[index].window }));
    if (states.some((state, index) => state.count >= limits[index].max)) return false;
    refs.forEach((ref, index) => tx.set(ref, { ...states[index], count: states[index].count + 1 }));
    return true;
  });
}
