"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      const redirectUrl = `${loginPath}?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
      return;
    }

    // Check role requirements if specified
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
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

  // Check role requirements
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return loadingComponent || <DefaultLoadingState />;
    }
  }

  // Authenticated (and authorized if roles specified) - render children
  return <>{children}</>;
}

/**
 * Default loading state component
 */
function DefaultLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading...</p>
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
