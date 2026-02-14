"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useOrgStatus } from "@/hooks/useOrgStatus";
import type { UserRole } from "@/lib/types";
import type { OrgStatus } from "@/lib/firestore/v2-types";

interface V2RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireOrgStatus?: OrgStatus;
  requireOrgAdmin?: boolean;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

/**
 * Enhanced V2 route guard with org status and org admin checks.
 * Builds on the existing ProtectedRoute pattern but adds employer-specific logic.
 *
 * - Not logged in -> /login
 * - Wrong role -> /home
 * - Employer with wrong org status -> /org/pending or /org/rejected
 * - requireOrgAdmin but user not in adminUids -> /home
 */
export function V2RouteGuard({
  children,
  allowedRoles,
  requireOrgStatus,
  requireOrgAdmin,
  redirectTo,
  loadingComponent,
}: V2RouteGuardProps) {
  const { user, role, loading: authLoading } = useAuth();
  const { orgStatus, orgLoading, isOrgAdmin } = useOrgStatus();
  const router = useRouter();
  const pathname = usePathname();

  const loading = authLoading || (role === "employer" && orgLoading);

  useEffect(() => {
    if (loading) return;

    // Not authenticated -> redirect to login
    if (!user) {
      const target = redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(target);
      return;
    }

    // Check role requirements
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        router.replace(redirectTo || "/home");
        return;
      }
    }

    // Check org status for employer routes
    if (requireOrgStatus && role === "employer") {
      if (orgStatus !== requireOrgStatus) {
        if (orgStatus === "pending") {
          router.replace("/org/pending");
        } else if (orgStatus === "rejected") {
          router.replace("/org/rejected");
        } else {
          router.replace(redirectTo || "/home");
        }
        return;
      }
    }

    // Check org admin requirement
    if (requireOrgAdmin) {
      if (!isOrgAdmin) {
        router.replace(redirectTo || "/home");
        return;
      }
    }
  }, [
    loading,
    user,
    role,
    orgStatus,
    isOrgAdmin,
    allowedRoles,
    requireOrgStatus,
    requireOrgAdmin,
    redirectTo,
    router,
    pathname,
  ]);

  // Show loading state while determining auth/org status
  if (loading) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Not authenticated - show loading while redirect happens
  if (!user) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Check role requirements
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return loadingComponent || <DefaultLoadingState />;
    }
  }

  // Check org status
  if (requireOrgStatus && role === "employer" && orgStatus !== requireOrgStatus) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Check org admin
  if (requireOrgAdmin && !isOrgAdmin) {
    return loadingComponent || <DefaultLoadingState />;
  }

  return <>{children}</>;
}

function DefaultLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
}
