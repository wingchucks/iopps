"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isUnverifiedPassword =
    user &&
    !user.emailVerified &&
    user.providerData?.[0]?.providerId === "password";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Hard redirect to /verify-email for unverified password users
  useEffect(() => {
    if (!loading && isUnverifiedPassword) {
      router.replace("/verify-email");
    }
  }, [loading, isUnverifiedPassword, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Mobile: top NavBar skeleton */}
        <div
          className="lg:hidden h-16 sticky top-0 z-50"
          style={{
            background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
          }}
        >
          <div className="flex items-center justify-between h-full px-4 md:px-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-7 rounded skeleton" style={{ opacity: 0.15 }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full skeleton" style={{ opacity: 0.15 }} />
            </div>
          </div>
        </div>

        {/* Desktop: sidebar rail skeleton */}
        <div
          className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-[72px] border-r z-40"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="h-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded skeleton" />
          </div>
          <div className="h-px mx-3" style={{ background: "var(--border)" }} />
          <div className="flex flex-col gap-2 py-3 px-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-10 h-10 rounded-lg skeleton" />
            ))}
          </div>
        </div>

        {/* Content skeleton (offset on desktop) */}
        <div className="lg:pl-[72px]">
          <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
            <div className="w-48 h-8 rounded skeleton mb-4" />
            <div className="w-72 h-4 rounded skeleton mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl skeleton" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || isUnverifiedPassword) return null;

  return <>{children}</>;
}
