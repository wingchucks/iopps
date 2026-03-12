"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";

interface AccountContextState {
  loading: boolean;
  memberProfile: MemberProfile | null;
  hasOrg: boolean;
  isEmployer: boolean;
  isAdmin: boolean;
  orgId: string | null;
  userRole: string | null;
}

const defaultState: AccountContextState = {
  loading: true,
  memberProfile: null,
  hasOrg: false,
  isEmployer: false,
  isAdmin: false,
  orgId: null,
  userRole: null,
};

export function useAccountContext(): AccountContextState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccountContextState>(defaultState);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ ...defaultState, loading: false });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    async function resolveAccountContext() {
      const currentUser = user;

      if (!currentUser) {
        if (!cancelled) {
          setState({ ...defaultState, loading: false });
        }
        return;
      }

      if (!cancelled) {
        setState((prev) => ({ ...prev, loading: true }));
      }

      let memberProfile: MemberProfile | null = null;
      let userData: Record<string, unknown> | null = null;
      let employerOrgId: string | null = null;
      let employerAuthorized = false;

      try {
        memberProfile = await getMemberProfile(currentUser.uid);
      } catch {
        memberProfile = null;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        userData = userSnap.exists()
          ? (userSnap.data() as Record<string, unknown>)
          : null;
      } catch {
        userData = null;
      }

      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch("/api/employer/check", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const data = (await res.json()) as {
            authorized?: boolean;
            profile?: { orgId?: string | null };
          };
          employerAuthorized = data.authorized === true;
          employerOrgId = data.profile?.orgId ?? null;
        }
      } catch {
        employerAuthorized = false;
      }

      const userRole =
        typeof userData?.role === "string" ? (userData.role as string) : null;
      const fallbackOrgId =
        (typeof memberProfile?.orgId === "string" && memberProfile.orgId) ||
        (typeof userData?.employerId === "string" && (userData.employerId as string)) ||
        null;
      const orgId = employerOrgId || fallbackOrgId;
      const isEmployer = employerAuthorized || userRole === "employer";
      const isAdmin =
        memberProfile?.role === "admin" ||
        memberProfile?.role === "moderator" ||
        userRole === "admin" ||
        userRole === "moderator";

      if (!cancelled) {
        setState({
          loading: false,
          memberProfile,
          hasOrg: Boolean(orgId),
          isEmployer,
          isAdmin,
          orgId,
          userRole,
        });
      }
    }

    void resolveAccountContext();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return state;
}
