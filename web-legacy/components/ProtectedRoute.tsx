"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required roles to access this route. If not specified, any authenticated user can access. */
  allowedRoles?: UserRole[];
  /** Custom redirect path for unauthenticated users. Defaults to /login */
  loginPath?: string;
  /** Custom redirect path when user lacks required role. Defaults to / */
  unauthorizedPath?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

/**
 * ProtectedRoute wrapper component
 *
 * Handles authentication and authorization for protected pages:
 * - Redirects unauthenticated users to login page
 * - Optionally checks for required roles
 * - Shows loading state while auth is being determined
 * - Shows recovery UI when profile can't be loaded (never a blank screen)
 * - Preserves the original URL for redirect after login
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <MyProtectedPage />
 * </ProtectedRoute>
 *
 * // With role requirements
 * <ProtectedRoute allowedRoles={["admin", "moderator"]}>
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  loginPath = "/login",
  unauthorizedPath = "/",
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);

  // Bootstrap grace period: when user is authed but role is null, give
  // AuthProvider's bootstrap 4s to create the doc before showing recovery UI.
  const needsBootstrapWait = !loading && !!user && !role && !!allowedRoles && allowedRoles.length > 0;
  useEffect(() => {
    if (!needsBootstrapWait) return;
    const timer = setTimeout(() => setBootstrapTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [needsBootstrapWait]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      const redirectUrl = `${loginPath}?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
      return;
    }

    // Role resolved — check role requirements
    if (allowedRoles && allowedRoles.length > 0) {
      if (role && !allowedRoles.includes(role)) {
        router.replace(unauthorizedPath);
        return;
      }
    }
  }, [user, role, loading, router, pathname, allowedRoles, loginPath, unauthorizedPath]);

  // Show loading state while determining auth
  if (loading) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Not authenticated - show loading while redirect happens
  if (!user) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // User exists but role is null — bootstrap may still be running
  if (!role && allowedRoles && allowedRoles.length > 0) {
    if (!bootstrapTimedOut) {
      return loadingComponent || <DefaultLoadingState />;
    }
    // Bootstrap timed out — show recovery UI instead of blank screen
    return <ProfileRecoveryState />;
  }

  // Role exists but doesn't match — show loading while redirect happens
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return loadingComponent || <DefaultLoadingState />;
  }

  // Authenticated (and authorized if roles specified) - render children
  return <>{children}</>;
}

/**
 * Default loading state component
 */
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

/**
 * Recovery UI when profile can't be loaded.
 * Non-negotiable: never show a blank screen.
 */
function ProfileRecoveryState() {
  const { logout } = useAuth();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Couldn&apos;t load your profile
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          We had trouble loading your account. This is usually temporary.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
          <button
            onClick={logout}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-lt)] transition-colors"
          >
            Sign out
          </button>
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          If this keeps happening,{" "}
          <a href="mailto:support@iopps.ca" className="text-accent hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Higher-order component version for wrapping entire page components
 *
 * Usage:
 * ```tsx
 * function MyPage() { ... }
 * export default withProtectedRoute(MyPage);
 *
 * // With options
 * export default withProtectedRoute(MyPage, { allowedRoles: ["admin"] });
 * ```
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedPage(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
