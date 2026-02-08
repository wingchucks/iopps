/**
 * useAdminCounts Hook
 *
 * Single source of truth for all admin panel counts.
 * Ensures dashboard and list pages show consistent numbers.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAllAdminCounts,
  getPendingItems,
  getFailedImports,
  type AdminCountsSnapshot,
  type PendingItem,
  type FailedImport,
} from "@/lib/firestore/admin-queries";

export interface AdminCountsState {
  counts: AdminCountsSnapshot;
  pendingItems: PendingItem[];
  failedImports: FailedImport[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseAdminCountsReturn extends AdminCountsState {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

const defaultCounts: AdminCountsSnapshot = {
  users: { total: 0, byRole: {} },
  memberProfiles: { total: 0, withResume: 0, withSkills: 0 },
  employers: { total: 0, pending: 0, approved: 0, rejected: 0 },
  vendors: { total: 0, pending: 0, active: 0, featured: 0 },
  jobs: { total: 0, active: 0, inactive: 0 },
  conferences: { total: 0, active: 0 },
  applications: { total: 0, recent7d: 0, recent30d: 0 },
  powwows: { total: 0, active: 0 },
};

/**
 * Hook to fetch and manage all admin counts
 *
 * Features:
 * - Single fetch for all counts (efficient)
 * - Auto-refresh on window focus
 * - Manual refresh capability
 * - Consistent with list page counts
 */
export function useAdminCounts(): UseAdminCountsReturn {
  const [state, setState] = useState<AdminCountsState>({
    counts: defaultCounts,
    pendingItems: [],
    failedImports: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setState((prev) => ({ ...prev, loading: true }));
    }

    try {
      // Fetch all data in parallel
      const [counts, pendingItems, failedImports] = await Promise.all([
        getAllAdminCounts(),
        getPendingItems(10),
        getFailedImports(),
      ]);

      setState({
        counts,
        pendingItems,
        failedImports,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching admin counts:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load admin data",
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if it's been more than 30 seconds since last update
      if (state.lastUpdated) {
        const timeSinceUpdate = Date.now() - state.lastUpdated.getTime();
        if (timeSinceUpdate > 30000) {
          fetchCounts(true);
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchCounts, state.lastUpdated]);

  const refresh = useCallback(async () => {
    await fetchCounts(true);
  }, [fetchCounts]);

  return {
    ...state,
    refresh,
    isRefreshing,
  };
}

// ============================================================================
// Computed Helpers
// ============================================================================

/**
 * Get total pending count across all entity types
 */
export function getTotalPending(counts: AdminCountsSnapshot): number {
  return counts.employers.pending + counts.vendors.pending;
}

/**
 * Get change indicator (for KPI cards showing +/- from previous period)
 */
export function getChangeIndicator(current: number, previous: number): {
  value: number;
  direction: "up" | "down" | "neutral";
  percentage: number;
} {
  const diff = current - previous;
  const percentage = previous > 0 ? Math.round((diff / previous) * 100) : 0;

  return {
    value: Math.abs(diff),
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    percentage: Math.abs(percentage),
  };
}

// ============================================================================
// Entity-Specific Count Hooks (for list pages)
// ============================================================================

import { getAdminCount, type StatusFilter, type EntityType } from "@/lib/firestore/admin-queries";

export interface EntityCountsState {
  total: number;
  byStatus: Record<string, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get counts for a specific entity type
 * Used by list pages to ensure count consistency
 */
export function useEntityCounts(
  entityType: EntityType,
  statusValues: StatusFilter[] = ["all", "pending", "approved", "rejected", "active", "inactive"]
): EntityCountsState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<EntityCountsState>({
    total: 0,
    byStatus: {},
    loading: true,
    error: null,
  });

  const fetchCounts = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Fetch counts for each status in parallel
      const results = await Promise.all(
        statusValues
          .filter((s) => s !== "all")
          .map(async (status) => {
            const result = await getAdminCount(entityType, { status, excludeDeleted: true });
            return { status, count: result.total };
          })
      );

      // Get total
      const totalResult = await getAdminCount(entityType, { status: "all", excludeDeleted: true });

      const byStatus: Record<string, number> = { all: totalResult.total };
      results.forEach(({ status, count }) => {
        byStatus[status] = count;
      });

      setState({
        total: totalResult.total,
        byStatus,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error(`Error fetching ${entityType} counts:`, error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load counts",
      }));
    }
  }, [entityType, statusValues]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch data on mount/param change
    fetchCounts();
  }, [fetchCounts]);

  return {
    ...state,
    refresh: fetchCounts,
  };
}
