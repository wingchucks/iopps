"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-context";
import { auth } from "./firebase";

const REFRESH_INTERVAL_MS = 55 * 60 * 1000; // 55 minutes

export function useTokenRefresh() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    async function refreshSession() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const idToken = await currentUser.getIdToken(true); // force refresh
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } catch {
        // Token refresh failed — will be caught by middleware on next navigation
      }
    }

    intervalRef.current = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
