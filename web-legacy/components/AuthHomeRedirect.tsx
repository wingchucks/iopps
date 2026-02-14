"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Client-side redirect: sends authenticated users from / to /discover.
 * Renders nothing — just performs the redirect when auth state resolves.
 */
export function AuthHomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/discover");
    }
  }, [loading, user, router]);

  return null;
}
