"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Nav skeleton */}
        <div
          className="h-16 sticky top-0 z-50"
          style={{
            background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
          }}
        >
          <div className="flex items-center justify-between h-full px-4 md:px-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-7 rounded skeleton" style={{ opacity: 0.15 }} />
              <div className="hidden md:flex gap-2">
                <div className="w-16 h-8 rounded-lg skeleton" style={{ opacity: 0.1 }} />
                <div className="w-16 h-8 rounded-lg skeleton" style={{ opacity: 0.1 }} />
                <div className="w-16 h-8 rounded-lg skeleton" style={{ opacity: 0.1 }} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block w-48 h-9 rounded-[10px] skeleton" style={{ opacity: 0.1 }} />
              <div className="w-9 h-9 rounded-full skeleton" style={{ opacity: 0.15 }} />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
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
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
