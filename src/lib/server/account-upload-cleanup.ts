import type { Bucket } from "@google-cloud/storage";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

export function ownedPersonalUpload(path: string, uid: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(uid) && (path.startsWith(`avatars/${uid}.`) || path.startsWith(`resumes/${uid}/`));
}

function storagePath(value: unknown, bucket: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    return match && decodeURIComponent(match[1]) === bucket ? decodeURIComponent(match[2]) : null;
  } catch { return null; }
}

/** The durable job is created in the same transaction as the account tombstone. */
export async function cleanClosedAccountUploads(db: Firestore, bucket: Bucket, auth: Auth, uid: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new Error("Invalid cleanup identity");
  const user = await db.doc(`users/${uid}`).get();
  if (user.data()?.status !== "deleted" || !user.data()?.deletedAt) throw new Error("Account must be closed before cleanup");
  try { await auth.deleteUser(uid); } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
  const applications = await db.collection("applications").where("userId", "==", uid).get();
  const shared = new Set<string>();
  for (const application of applications.docs) {
    const data = application.data();
    for (const value of [data.resumeUrl, data.profileSnapshot?.resumeUrl, data.profileSnapshot?.photoURL]) {
      const path = storagePath(value, bucket.name);
      if (path) shared.add(path);
    }
  }
  const groups = await Promise.all([bucket.getFiles({ prefix: `avatars/${uid}.` }), bucket.getFiles({ prefix: `resumes/${uid}/` })]);
  let deleted = 0;
  for (const [files] of groups) for (const file of files) {
    if (!ownedPersonalUpload(file.name, uid) || shared.has(file.name)) continue;
    // Pin the listed generation so a concurrent replacement is retried later.
    await file.delete({ ignoreNotFound: true, ...(file.metadata.generation ? { ifGenerationMatch: Number(file.metadata.generation) } : {}) });
    deleted++;
  }
  return { deleted, retainedShared: shared.size };
}
