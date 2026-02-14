"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useAsyncData Hook
 *
 * Generic hook for the loading/error/data state pattern used across 100+ components.
 * Handles cleanup on unmount to prevent state updates after unmount.
 *
 * @param fetcher - Async function that returns the data
 * @param deps - Dependency array for re-fetching (like useEffect deps)
 * @returns Object with data, loading, error state, and a refetch function
 *
 * @example
 * ```tsx
 * const { data: users, loading, error, refetch } = useAsyncData(
 *   () => fetchUsers(orgId),
 *   [orgId]
 * );
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track whether the component is still mounted
  const mountedRef = useRef(true);

  // Track the current fetch call to ignore stale responses
  const fetchIdRef = useRef(0);

  const execute = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // Only update state if this is still the latest fetch and component is mounted
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch };
}
