"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { auth } from "./firebase";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (user) {
      timerRef.current = setTimeout(handleTimeout, TIMEOUT_MS);
    }
  }, [user, handleTimeout]);

  useEffect(() => {
    if (!user) return;

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [user, resetTimer]);
}
