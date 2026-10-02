"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { auth } from "./firebase";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes without activity in every tab
const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "focus"] as const;
// Signing out applies to every tab, so idleness must too: tabs share their
// latest activity time and an idle tab never signs out someone working in another.
const LAST_ACTIVITY_KEY = "iopps:last-activity";
const SHARE_INTERVAL_MS = 15 * 1000; // throttles storage writes; far below the timeout

function readSharedActivity(): number {
  try {
    const value = Number(window.localStorage?.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0; // Storage unavailable: this tab relies on its own activity.
  }
}

function writeSharedActivity(at: number) {
  try {
    window.localStorage?.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // Storage unavailable: this tab relies on its own activity.
  }
}

/** A visible page whose focus is inside an embedded player, such as a livestream, is being watched. */
function isWatchingEmbeddedMedia(): boolean {
  return typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    document.activeElement?.tagName === "IFRAME";
}

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleTimeout = useCallback(async () => {
    try {
      if (!user || auth.currentUser !== user) return;
      await signOut(user.uid);
      if (auth.currentUser) return;
    } catch {
      // A failed deletion must not announce a completed sign-out.
      return;
    }
    router.replace("/login?reason=timeout");
  }, [user, signOut, router]);

  useEffect(() => {
    if (!user) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Signing in or switching accounts counts as activity in this tab only.
    let lastActivity = Date.now();
    let lastShared = 0;
    const idleFor = (now: number) => {
      const shared = readSharedActivity();
      // A shared time ahead of this clock (after a clock change) cannot postpone the timeout.
      return now - Math.max(lastActivity, shared <= now ? shared : 0);
    };

    const recordActivity = (now: number) => {
      lastActivity = now;
      if (now - lastShared >= SHARE_INTERVAL_MS) {
        lastShared = now;
        writeSharedActivity(now);
      }
    };

    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      if (timer) clearTimeout(timer);
      timer = null;
      try {
        const now = Date.now();
        if (isWatchingEmbeddedMedia()) recordActivity(now);
        if (idleFor(now) >= TIMEOUT_MS) await handleTimeout();
      } finally {
        checking = false;
        if (!disposed) timer = setTimeout(check, CHECK_INTERVAL_MS);
      }
    };

    const onActivity = () => {
      const now = Date.now();
      // Every tab was already idle for the whole timeout (for example a device
      // waking from sleep before its check ran): the session has lapsed.
      if (now - lastActivity >= TIMEOUT_MS && idleFor(now) >= TIMEOUT_MS) {
        void check();
        return;
      }
      recordActivity(now);
    };

    timer = setTimeout(check, CHECK_INTERVAL_MS);
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onActivity);
    }

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onActivity);
      }
    };
  }, [user, handleTimeout]);
}
