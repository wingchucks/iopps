import { createHash, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { LivestreamVideo } from "../livestreams.ts";

export const SHARED_VIDEO_MINUTE_LIMIT = 10;
export const SHARED_VIDEO_DAY_LIMIT = 500;
const NEGATIVE_CACHE_MS = 5 * 60_000;
const VIDEO_CACHE_MS = 60_000;
const LEASE_MS = 15_000;
type LookupResult = { video: LivestreamVideo | null; unavailable?: boolean };

/** Reserve extra YouTube calls across instances; ordinary discovery uses no budget. */
export async function resolveSharedYouTubeVideo(
  db: Firestore,
  channelId: string,
  videoId: string,
  lookup: () => Promise<LivestreamVideo | null>,
  clock: () => number = Date.now,
): Promise<LookupResult> {
  if (!/^UC[A-Za-z0-9_-]+$/.test(channelId) || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return { video: null };
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const cacheRef = db.collection("youtubeSharedVideoCache").doc(digest(`${channelId}:${videoId}`));
  const budgetRef = db.collection("youtubeSharedVideoLimits").doc(digest(channelId));
  const leaseId = randomUUID();
  let reservation: { reserved: true } | { reserved: false; result: LookupResult };
  try {
    reservation = await db.runTransaction(async tx => {
      const now = clock();
      const [cached, budget] = await tx.getAll(cacheRef, budgetRef);
      const record = cached.data();
      if (record && record.expiresAtMs > now) {
        return { reserved: false as const, result: record.state === "ready"
          ? { video: record.video ?? null, ...(record.unavailable ? { unavailable: true } : {}) }
          : { video: null, unavailable: true } };
      }
      const minute = Math.floor(now / 60_000), day = Math.floor(now / 86_400_000);
      const counts = budget.data();
      const minuteCount = counts?.minute === minute ? Number(counts.minuteCount) || 0 : 0;
      const dayCount = counts?.day === day ? Number(counts.dayCount) || 0 : 0;
      if (minuteCount >= SHARED_VIDEO_MINUTE_LIMIT || dayCount >= SHARED_VIDEO_DAY_LIMIT) {
        return { reserved: false as const, result: { video: null, unavailable: true } };
      }
      tx.set(budgetRef, { channelId, minute, day, minuteCount: minuteCount + 1, dayCount: dayCount + 1 });
      tx.set(cacheRef, { channelId, videoId, state: "pending", leaseId, expiresAtMs: now + LEASE_MS, expiresAt: new Date(now + LEASE_MS) });
      return { reserved: true as const };
    });
  } catch {
    // A failed shared limiter must never turn into an unrestricted upstream call.
    return { video: null, unavailable: true };
  }
  if (!reservation.reserved) return reservation.result;

  let result: LookupResult;
  try { result = { video: await lookup() }; }
  catch { result = { video: null, unavailable: true }; }
  const expiresAtMs = clock() + (result.video || result.unavailable ? VIDEO_CACHE_MS : NEGATIVE_CACHE_MS);
  try {
    await db.runTransaction(async tx => {
      const current = await tx.get(cacheRef);
      if (current.data()?.leaseId !== leaseId) return;
      // Normalized optional video fields must not store undefined Firestore values.
      tx.set(cacheRef, {
        channelId, videoId, state: "ready", ...JSON.parse(JSON.stringify(result)),
        expiresAtMs, expiresAt: new Date(expiresAtMs),
      });
    });
  } catch { /* The call was already budgeted; a cache-write failure cannot reset it. */ }
  return result;
}
