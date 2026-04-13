"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import { resolveLinkedOrganizationId } from "@/lib/account-state";
import { isOrganizationAccessBlocked } from "@/lib/access-state";
import { fetchWithTimeout, isAbortError } from "@/lib/client/fetch-with-timeout";

interface AccountContextState {
  loading: boolean;
  memberProfile: MemberProfile | null;
  hasOrg: boolean;
  isEmployer: boolean;
  isAdmin: boolean;
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  orgType: string | null;
  userRole: string | null;
}

const defaultState: AccountContextState = {
  loading: true,
  memberProfile: null,
  hasOrg: false,
  isEmployer: false,
  isAdmin: false,
  orgId: null,
  orgSlug: null,
  orgName: null,
  orgType: null,
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
      let orgSlug: string | null = null;
      let orgName: string | null = null;
      let orgType: string | null = null;
      let activeOrgId: string | null = null;
      let claimOrgId: string | null = null;
      let claimEmployerId: string | null = null;
      let claimRole: string | null = null;
      let idToken = "";

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
        const idTokenResult = await currentUser.getIdTokenResult();
        idToken = idTokenResult.token;
        claimOrgId =
          typeof idTokenResult.claims.orgId === "string"
            ? (idTokenResult.claims.orgId as string)
            : null;
        claimEmployerId =
          typeof idTokenResult.claims.employerId === "string"
            ? (idTokenResult.claims.employerId as string)
            : null;
        claimRole =
          typeof idTokenResult.claims.role === "string"
            ? (idTokenResult.claims.role as string)
            : null;
      } catch {
        idToken = "";
      }

      try {
        if (!idToken) {
          idToken = await currentUser.getIdToken();
        }

        const res = await fetchWithTimeout(
          "/api/employer/check",
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
          4500,
        );

        if (res.ok) {
          const data = (await res.json()) as {
            authorized?: boolean;
            profile?: { orgId?: string | null };
          };
          employerAuthorized = data.authorized === true;
          employerOrgId = data.profile?.orgId ?? null;
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("[useAccountContext] employer check failed:", error);
        }
        employerAuthorized = false;
      }

      const userRole =
        typeof userData?.role === "string"
          ? (userData.role as string)
          : claimRole;
      const orgId = resolveLinkedOrganizationId({
        memberOrgId: employerOrgId || memberProfile?.orgId,
        userOrgId: userData?.orgId,
        userEmployerId: userData?.employerId,
        claimOrgId,
        claimEmployerId,
      });

      if (orgId) {
        try {
          const organization = await getOrganization(orgId);
          if (organization && !isOrganizationAccessBlocked(organization)) {
            activeOrgId = orgId;
            orgSlug = organization.slug || orgId;
            orgName = organization.name || null;
            orgType = organization.type || null;
          }
        } catch {
          orgSlug = orgId;
        }
      }

      const hasLinkedOrg = Boolean(orgId);
      const hasEmployerRole =
        userRole === "employer" ||
        userRole === "school" ||
        userRole === "organization";
      const isEmployer =
        employerAuthorized ||
        Boolean(activeOrgId) ||
        (hasEmployerRole && !hasLinkedOrg);
      const isAdmin =
        memberProfile?.role === "admin" ||
        memberProfile?.role === "moderator" ||
        userRole === "admin" ||
        userRole === "moderator";

      if (!cancelled) {
        setState({
          loading: false,
          memberProfile,
          hasOrg: Boolean(activeOrgId),
          isEmployer,
          isAdmin,
          orgId: activeOrgId,
          orgSlug,
          orgName,
          orgType,
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
