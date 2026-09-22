"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { setupDestination } from "../setup/destination";

export default function DashboardAlias() {
  return <ProtectedRoute><DashboardDestination /></ProtectedRoute>;
}

function DashboardDestination() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setError(false);
    void (async () => {
      try {
        const token = await user.getIdToken();
        if (cancelled) return;
        const response = await fetch("/api/auth/account", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Account unavailable");
        const data = await response.json();
        const destination = setupDestination(data.destination, new URLSearchParams(), true);
        if (!cancelled && destination) router.replace(destination);
      } catch { if (!cancelled) setError(true); }
      finally { clearTimeout(timer); }
    })();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [user, router, attempt]);
  return <div className="p-8">{error ? <><p role="alert">We couldn’t load your account. Please retry.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></> : <p role="status">Loading your account...</p>}</div>;
}
