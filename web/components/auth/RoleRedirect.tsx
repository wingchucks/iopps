"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useOrgStatus } from "@/hooks/useOrgStatus";

/**
 * Redirect component based on auth state and role.
 *
 * - Not logged in -> return null (let page render, e.g. landing page)
 * - community -> /home
 * - employer -> check org status:
 *   - active -> /org/dashboard
 *   - pending -> /org/pending
 *   - rejected -> /org/rejected
 * - admin/moderator -> /admin
 */
export function RoleRedirect() {
  const { user, role, loading: authLoading } = useAuth();
  const { orgStatus, orgLoading } = useOrgStatus();
  const router = useRouter();

  const loading = authLoading || (role === "employer" && orgLoading);

  useEffect(() => {
    if (loading) return;

    // Not logged in — let the page render (e.g. landing/login page)
    if (!user) return;

    switch (role) {
      case "community":
        router.replace("/home");
        break;

      case "employer":
        if (orgStatus === "active") {
          router.replace("/org/dashboard");
        } else if (orgStatus === "rejected") {
          router.replace("/org/rejected");
        } else if (orgStatus === "pending") {
          router.replace("/org/pending");
        } else {
          // No V2 org — fall back to legacy employer dashboard
          router.replace("/organization/dashboard");
        }
        break;

      case "admin":
      case "moderator":
        router.replace("/admin");
        break;

      default:
        // Unknown role — send to home
        router.replace("/home");
        break;
    }
  }, [loading, user, role, orgStatus, router]);

  // While loading, show spinner
  if (loading && user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — render nothing (let the underlying page show)
  return null;
}
