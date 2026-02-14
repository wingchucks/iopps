"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, the user must have one of these roles to access the page */
  requiredRole?: UserRole | UserRole[];
  /** Custom redirect when not authenticated (defaults to /login?redirect=...) */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowedRoles: UserRole[] | null = requiredRole
    ? Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole]
    : null;

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      const target =
        redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(target);
      return;
    }

    // Role check
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        router.replace(redirectTo || "/");
        return;
      }
    }
  }, [loading, user, role, allowedRoles, redirectTo, router, pathname]);

  // Loading skeleton
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Not authenticated - show skeleton while redirect happens
  if (!user) {
    return <LoadingSkeleton />;
  }

  // Wrong role - show access denied
  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          You do not have permission to view this page.
        </p>
      </div>
    </div>
  );
}
