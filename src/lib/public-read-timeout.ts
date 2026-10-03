/** Upper bound for one shared public read (homepage cards, SEO metadata, route index). */
export const PUBLIC_READ_TIMEOUT_MS = 8_000;

export class PublicReadTimeoutError extends Error {}

/**
 * Rejects when a public read takes longer than `ms`. A rejection is never cached
 * by `unstable_cache`: a stale entry keeps serving its last good value, and the
 * caller renders a fallback on a cold miss. The underlying read is not cancelled;
 * it simply stops holding the request (or its background revalidation) open.
 */
export function withPublicReadTimeout<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  label: string,
  ms = PUBLIC_READ_TIMEOUT_MS,
): (...args: Args) => Promise<Result> {
  return (...args: Args) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new PublicReadTimeoutError(`${label} timed out after ${ms} ms`)), ms);
    });
    return Promise.race([Promise.resolve().then(() => read(...args)), timeout])
      .finally(() => clearTimeout(timer));
  };
}

/** Render-time fallback for a failed or slow public read; logs the cause. */
export async function publicReadOr<T>(label: string, read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error(`[public-read] ${label} unavailable:`, error);
    return fallback;
  }
}
