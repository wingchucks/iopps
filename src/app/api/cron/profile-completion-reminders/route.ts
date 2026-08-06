import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendProfileCompletionReminder } from "@/lib/email";
import { nextProfileReminderStage, type ProfileReminderKind, type ReminderHistory } from "@/lib/profile-completion-reminder";

const REMINDERS_COLLECTION = "profileCompletionReminders";
const DEFAULT_LIMIT = 200;

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}` || request.headers.get("x-cron-secret") === expected;
}

function hoursSince(dateString?: string): number {
  if (!dateString) return 0;
  const createdAt = new Date(dateString).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  return Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60));
}

async function hasCompletedProfile(uid: string, email?: string): Promise<boolean> {
  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.exists && userDoc.data()?.profileComplete === true) return true;

  const memberDoc = await db.collection("members").doc(uid).get();
  if (memberDoc.exists && memberDoc.data()?.profileComplete === true) return true;

  if (email) {
    const userByEmail = await db.collection("users").where("email", "==", email).where("profileComplete", "==", true).limit(1).get();
    if (!userByEmail.empty) return true;

    const memberByEmail = await db.collection("members").where("email", "==", email).where("profileComplete", "==", true).limit(1).get();
    if (!memberByEmail.empty) return true;
  }

  return false;
}

async function reminderKindFor(user: UserRecord): Promise<ProfileReminderKind | null> {
  if (await hasCompletedProfile(user.uid, user.email || undefined)) return null;
  return user.emailVerified ? "incomplete_profile" : "unverified_signup";
}

async function processUser(user: UserRecord, dryRun: boolean) {
  const email = user.email;
  if (!email || user.disabled) return { uid: user.uid, skipped: "no-email-or-disabled" };

  const kind = await reminderKindFor(user);
  if (!kind) return { uid: user.uid, email, skipped: "profile-complete" };

  const db = getAdminDb();
  const reminderRef = db.collection(REMINDERS_COLLECTION).doc(user.uid);
  const reminderSnap = await reminderRef.get();
  const history = (reminderSnap.exists ? reminderSnap.data() : {}) as ReminderHistory;
  const stage = nextProfileReminderStage(hoursSince(user.metadata.creationTime), history);
  if (!stage) return { uid: user.uid, email, kind, skipped: "not-due-or-stopped" };

  if (dryRun) return { uid: user.uid, email, kind, stage, dryRun: true };

  const result = await sendProfileCompletionReminder({
    email,
    displayName: user.displayName || null,
    kind,
    stage,
  });

  if (!result.success) {
    await reminderRef.set({
      uid: user.uid,
      email,
      kind,
      lastError: result.error || "unknown error",
      lastAttemptedStage: stage,
      lastAttemptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { uid: user.uid, email, kind, stage, sent: false, error: result.error };
  }

  await reminderRef.set({
    uid: user.uid,
    email,
    displayName: user.displayName || null,
    kind,
    sentStages: { [stage]: FieldValue.serverTimestamp() },
    lastSentStage: stage,
    lastSentSubject: result.subject || "Finish your IOPPS profile",
    lastSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { uid: user.uid, email, kind, stage, sent: true };
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dryRun === true;
  const limit = Math.min(Number(body.limit) || DEFAULT_LIMIT, 1000);
  const onlyEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const auth = getAdminAuth();
  const users = onlyEmail
    ? [await auth.getUserByEmail(onlyEmail)]
    : (await auth.listUsers(limit)).users;

  const results = [];
  for (const user of users) {
    results.push(await processUser(user, dryRun));
  }

  return NextResponse.json({ ok: true, dryRun, processed: results.length, results });
}
