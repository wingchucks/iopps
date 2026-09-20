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

export interface UploadCleanupCursor { prefixIndex: number; pageToken?: string }
interface CleanupOptions {
  cursor?: UploadCleanupCursor | null;
  deadline?: number;
  assertOwnership?: () => Promise<void>;
  onAuthRemoved?: () => Promise<void>;
}

/** The durable job is created in the same transaction as the account tombstone. */
export async function cleanClosedAccountUploads(db: Firestore, bucket: Bucket, auth: Auth, uid: string, options: CleanupOptions = {}) {
  const cursor = options.cursor || { prefixIndex: 0 };
  if (![0, 1].includes(cursor.prefixIndex) || (cursor.pageToken !== undefined && typeof cursor.pageToken !== "string")) throw new Error("Invalid cleanup cursor");
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new Error("Invalid cleanup identity");
  const user = await db.doc(`users/${uid}`).get();
  if (user.data()?.status !== "deleted" || !user.data()?.deletedAt) throw new Error("Account must be closed before cleanup");
  const deletedAt = JSON.stringify(user.data()?.deletedAt);
  const deadline = Math.min(options.deadline ?? Infinity, Date.now() + 20_000);
  const assertCanContinue = async () => {
    if (Date.now() >= deadline) throw new Error("Cleanup time budget exhausted");
    await options.assertOwnership?.();
    const current = (await db.doc(`users/${uid}`).get()).data();
    if (current?.status !== "deleted" || JSON.stringify(current.deletedAt) !== deletedAt) throw new Error("Account tombstone changed during cleanup");
    if (Date.now() >= deadline) throw new Error("Cleanup time budget exhausted");
  };
  await assertCanContinue();
  try { await auth.deleteUser(uid); } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
  // Persist confirmation before any fallible reference/Storage work. A missing
  // Auth user confirms absence now, not when a legacy closure was requested.
  await assertCanContinue();
  await options.onAuthRemoved?.();
  const shared = new Set<string>();
  // Bound each read and check the time budget between pages. Never delete after
  // an incomplete current OR legacy reference scan.
  for (const field of ["userId", "memberId"]) {
    let query = db.collection("applications").where(field, "==", uid).orderBy("__name__").limit(250);
    while (true) {
      await assertCanContinue();
      const snapshot = await query.get();
      for (const application of snapshot.docs) {
        const data = application.data();
        for (const value of [data.resumeUrl, data.profileSnapshot?.resumeUrl, data.profileSnapshot?.photoURL]) {
          const path = storagePath(value, bucket.name);
          if (path) shared.add(path);
        }
      }
      if (snapshot.docs.length < 250) break;
      query = query.startAfter(snapshot.docs[snapshot.docs.length - 1]);
    }
  }
  const prefixes = [`avatars/${uid}.`, `resumes/${uid}/`];
  let deleted = 0, scanned = 0;
  for (let prefixIndex = cursor.prefixIndex; prefixIndex < prefixes.length; prefixIndex++) {
    await assertCanContinue();
    const [files, next] = await bucket.getFiles({ prefix: prefixes[prefixIndex], autoPaginate: false, maxResults: 100 - scanned,
      ...(prefixIndex === cursor.prefixIndex && cursor.pageToken ? { pageToken: cursor.pageToken } : {}) });
    for (const file of files) {
      scanned++;
      if (!ownedPersonalUpload(file.name, uid) || shared.has(file.name)) continue;
      // Pin the listed generation so a concurrent replacement is retried later.
      const generation = file.metadata.generation;
      if (!generation || !/^[1-9]\d*$/.test(String(generation))) throw new Error("Missing or invalid upload generation");
      const numericGeneration = Number(generation);
      // Keep large generation identifiers exact; never fall back to an unpinned delete.
      const ifGenerationMatch = Number.isSafeInteger(numericGeneration) ? numericGeneration : String(generation);
      await assertCanContinue();
      await file.delete({ ignoreNotFound: true, ...{ ifGenerationMatch } });
      deleted++;
    }
    await assertCanContinue();
    if (next?.pageToken) return { deleted, retainedShared: shared.size, cursor: { prefixIndex, pageToken: next.pageToken } };
    if (scanned >= 100 && prefixIndex + 1 < prefixes.length) return { deleted, retainedShared: shared.size, cursor: { prefixIndex: prefixIndex + 1 } };
  }
  return { deleted, retainedShared: shared.size, cursor: null };
}
