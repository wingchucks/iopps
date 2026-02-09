"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getOrganizationByOwner } from "@/lib/firestore/v2-organizations";
import type { V2Organization, OrgStatus } from "@/lib/firestore/v2-types";

interface UseOrgStatusResult {
  org: V2Organization | null;
  orgStatus: OrgStatus | null;
  orgLoading: boolean;
  isOrgAdmin: boolean;
}

/**
 * Custom hook that fetches the current employer's organization and its status.
 * Queries v2_organizations where ownerUid == user.uid.
 * Also checks if the user is in the org's adminUids array.
 * Caches the result for the lifetime of the component to avoid repeated queries.
 */
export function useOrgStatus(): UseOrgStatusResult {
  const { user, role, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<V2Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return;

    // Only query for employer role
    if (!user || role !== "employer") {
      setOrg(null);
      setOrgLoading(false);
      setFetched(true);
      return;
    }

    // Skip if already fetched for this user
    if (fetched) return;

    let cancelled = false;

    async function fetchOrg() {
      try {
        const result = await getOrganizationByOwner(user!.uid);
        if (!cancelled) {
          setOrg(result);
        }
      } catch (error) {
        console.error("Error fetching org status:", error);
        if (!cancelled) {
          setOrg(null);
        }
      } finally {
        if (!cancelled) {
          setOrgLoading(false);
          setFetched(true);
        }
      }
    }

    fetchOrg();

    return () => {
      cancelled = true;
    };
  }, [user, role, authLoading, fetched]);

  const isOrgAdmin = Boolean(
    user && org?.adminUids?.includes(user.uid)
  );

  return {
    org,
    orgStatus: org?.status ?? null,
    orgLoading: authLoading || orgLoading,
    isOrgAdmin,
  };
}
