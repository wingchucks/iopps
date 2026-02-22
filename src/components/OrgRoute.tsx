"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
        let memberProfile = await getMemberProfile(user!.uid);

        // Fallback: if no member profile or no orgId, check users collection for employerId
        if (!memberProfile?.orgId) {
          console.log("[OrgRoute] No member profile, checking users collection for uid:", user!.uid);
          let userDoc;
          try {
            userDoc = await getDocFromServer(doc(db, "users", user!.uid));
          } catch {
            // Fallback to cache if server unreachable
            userDoc = await getDoc(doc(db, "users", user!.uid));
          }
          const userData = userDoc.data();
          console.log("[OrgRoute] User data:", userData?.role, userData?.employerId);
          if (userData?.employerId && userData?.role === "employer") {
            // Employer without a members entry — synthesize a profile
            memberProfile = {
              uid: user!.uid,
              email: userData.email || user!.email || "",
              displayName: userData.displayName || user!.displayName || "",
              orgId: userData.employerId,
              orgRole: "owner",
            } as MemberProfile;
          } else {
            router.replace("/feed");
            return;
          }
        }

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
        {/* Mobile nav skeleton */}
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

        {/* Desktop sidebar rail skeleton */}
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

        {/* Content skeleton */}
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
