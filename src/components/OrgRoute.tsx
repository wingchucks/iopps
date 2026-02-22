"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MemberProfile } from "@/lib/firestore/members";

interface OrgRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "admin";
}

export default function OrgRoute({ children, requiredRole }: OrgRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    async function checkOrg() {
      try {
        // Use server-side API to avoid Firestore client offline issues
        const idToken = await user!.getIdToken();
        const res = await fetch("/api/employer/check", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authorized && data.profile) {
            const memberProfile = data.profile as MemberProfile;

            if (requiredRole) {
              const role = memberProfile.orgRole;
              if (requiredRole === "owner" && role !== "owner") {
                router.replace("/org/dashboard");
                return;
              }
              if (requiredRole === "admin" && role !== "owner" && role !== "admin") {
                router.replace("/org/dashboard");
                return;
              }
            }

            setProfile(memberProfile);
            setAuthorized(true);
            return;
          }
        }

        // Not an employer/org member
        router.replace("/feed");
      } catch (err) {
        console.error("[OrgRoute] checkOrg failed:", err);
        router.replace("/feed");
      } finally {
        setChecking(false);
      }
    }

    checkOrg();
  }, [user, loading, router, requiredRole]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-bg">
        <div
          className="lg:hidden h-16 sticky top-0 z-50"
          style={{
            background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
          }}
        >
          <div className="flex items-center justify-between h-full px-4 md:px-10">
            <div className="w-20 h-7 rounded skeleton" style={{ opacity: 0.15 }} />
            <div className="w-9 h-9 rounded-full skeleton" style={{ opacity: 0.15 }} />
          </div>
        </div>
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
        <div className="lg:pl-[72px]">
          <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
            <div className="w-48 h-8 rounded skeleton mb-4" />
            <div className="w-72 h-4 rounded skeleton mb-8" />
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !authorized || !profile) return null;

  return <>{children}</>;
}
