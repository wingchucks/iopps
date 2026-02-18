"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberProfile } from "@/lib/firestore/members";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    async function checkAdmin() {
      try {
        const profile = await getMemberProfile(user!.uid);
        if (profile && profile.role === "admin") {
          setIsAdmin(true);
        } else {
          router.replace("/feed");
        }
      } catch {
        router.replace("/feed");
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [user, loading, router]);

  if (loading || checking) {
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
            </div>
            <div className="flex items-center gap-3">
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
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return <>{children}</>;
}
