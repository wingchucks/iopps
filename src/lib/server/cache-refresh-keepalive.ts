import { after } from "next/server";
// Next.js never bundles an ".external" module per route, so this is the same request
// store that Next.js registers cache refreshes on.
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";

const keptAlive = new WeakSet<object>();

/**
 * Next.js 16 serves a stale `unstable_cache` entry at once and refreshes it in the
 * background, but it only asks the platform to wait for refreshes that start before a
 * full page begins streaming, and for client navigations (RSC requests) it waits for
 * none. Refreshes started by streamed metadata or a navigation were therefore suspended
 * with the function on Vercel, and their read bound fired when the instance next woke.
 * Called during a request, this waits after the response for every refresh and cache
 * write the request started, including any a refresh starts while it runs.
 */
export function keepCacheRefreshesAlive(): void {
  const store = workAsyncStorage.getStore();
  if (!store || keptAlive.has(store)) return;
  keptAlive.add(store);
  try {
    after(async () => {
      const settled = new Set<Promise<unknown>>();
      for (;;) {
        const pending = Object.values(store.pendingRevalidates ?? {}).filter(refresh => !settled.has(refresh));
        if (pending.length === 0) return;
        await Promise.allSettled(pending);
        for (const refresh of pending) settled.add(refresh);
      }
    });
  } catch {
    // No request to extend (a build, or a runtime without waitUntil): nothing to keep alive.
  }
}
