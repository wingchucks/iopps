"use client";

import { useState, useMemo } from "react";

/**
 * useListFilters Hook
 *
 * Generic hook for the search + status filter pattern repeated across listing pages.
 * Performs case-insensitive substring search across specified fields and
 * optionally filters by a status field.
 *
 * @param items - The full array of items to filter
 * @param options - Configuration for search fields and optional status field
 * @returns Filtered items and filter state controls
 *
 * @example
 * ```tsx
 * const { filtered, search, setSearch, statusFilter, setStatusFilter } = useListFilters(
 *   jobs,
 *   { searchFields: ["title", "employerName"], statusField: "status" }
 * );
 * ```
 */
export function useListFilters<T>(
  items: T[],
  options: {
    searchFields: (keyof T)[];
    statusField?: keyof T;
  }
): {
  filtered: T[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
} {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = items;

    // Apply status filter
    if (statusFilter !== "all" && options.statusField) {
      result = result.filter((item) => {
        const value = item[options.statusField!];
        return String(value) === statusFilter;
      });
    }

    // Apply search filter
    if (search.trim() && options.searchFields.length > 0) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((item) =>
        options.searchFields.some((field) => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    return result;
  }, [items, search, statusFilter, options.searchFields, options.statusField]);

  return {
    filtered,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
  };
}
