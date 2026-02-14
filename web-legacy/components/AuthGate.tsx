"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/** Routes accessible without authentication */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/about",
  "/contact",
  "/for-employers",
  "/offline",
  "/register",
];

/** Route prefixes accessible without authentication */
const PUBLIC_PATH_PREFIXES = ["/signup/", "/api/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Global auth gate that requires authentication for all non-public routes.
 * Public routes (landing, login, signup, legal pages) render immediately.
 * Protected routes redirect unauthenticated users to /login with a redirect param.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (isPublic || loading) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isPublic, loading, user, pathname, router]);

  if (isPublic) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
