/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useAdminList Hook
 *
 * Generic list management hook for admin pages.
 * Provides consistent pagination, filtering, sorting, and search across all entity types.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAdminCount, type EntityType, type StatusFilter } from "@/lib/firestore/admin-queries";

// ============================================================================
// Types
// ============================================================================

export interface AdminListConfig<T> {
  entityType: EntityType;
  pageSize?: number;
  defaultSort?: { field: string; direction: "asc" | "desc" };
  defaultStatus?: StatusFilter;
  searchFields?: (keyof T)[];
  transformItem?: (doc: QueryDocumentSnapshot) => T;
  filterFn?: (item: T, status: StatusFilter) => boolean;
}

export interface AdminListState<T> {
  items: T[];
  filteredItems: T[];
  total: number;
  filteredTotal: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

export interface AdminListFilters {
  status: StatusFilter;
  search: string;
  sortField: string;
  sortDirection: "asc" | "desc";
}

export interface AdminListActions {
  setStatus: (status: StatusFilter) => void;
  setSearch: (search: string) => void;
  setSort: (field: string, direction?: "asc" | "desc") => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  goToPage: (page: number) => void;
  updateItem: (id: string, updates: Partial<DocumentData>) => void;
  removeItem: (id: string) => void;
}

export interface UseAdminListReturn<T> {
  state: AdminListState<T>;
  filters: AdminListFilters;
  actions: AdminListActions;
  counts: Record<string, number>;
}

// ============================================================================
// Default Implementations
// ============================================================================

function defaultTransform<T>(doc: QueryDocumentSnapshot): T {
  return {
    id: doc.id,
    ...doc.data(),
  } as T;
}

function defaultFilterFn<T extends { status?: string; active?: boolean; deletedAt?: unknown }>(
  item: T,
  status: StatusFilter
): boolean {
  // Always exclude soft-deleted items
  if (item.deletedAt) return false;

  if (status === "all") return true;

  // Handle boolean active field
  if ("active" in item && typeof item.active === "boolean") {
    if (status === "active") return item.active === true;
    if (status === "inactive") return item.active === false;
  }

  // Handle string status field
  if ("status" in item && typeof item.status === "string") {
    if (status === "pending") return item.status === "pending" || !item.status;
    return item.status === status;
  }

  return true;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAdminList<T extends DocumentData & { id: string }>(
  config: AdminListConfig<T>
): UseAdminListReturn<T> {
  const {
    entityType,
    pageSize = 20,
    defaultSort = { field: "createdAt", direction: "desc" },
    defaultStatus = "all",
    searchFields = [],
    transformItem = defaultTransform,
    filterFn = defaultFilterFn,
  } = config;

  // State
  const [allItems, setAllItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [status, setStatus] = useState<StatusFilter>(defaultStatus);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(defaultSort.field);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultSort.direction);

  // Counts for filter pills
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch all items (for client-side filtering)
  const fetchItems = useCallback(
    async (loadMore = false) => {
      if (!db) {
        setError("Database not initialized");
        setLoading(false);
        return;
      }

      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setAllItems([]);
      }

      try {
        const collectionRef = collection(db, entityType);
        let q = query(collectionRef, orderBy(sortField, sortDirection));

        if (loadMore && lastDoc) {
          q = query(collectionRef, orderBy(sortField, sortDirection), startAfter(lastDoc));
        }

        // Fetch with limit for initial load
        q = query(q, limit(loadMore ? pageSize : pageSize * 3));

        const snapshot = await getDocs(q);
        const newItems = snapshot.docs.map((doc) => transformItem(doc) as T);

        if (loadMore) {
          setAllItems((prev) => [...prev, ...newItems]);
        } else {
          setAllItems(newItems);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length >= pageSize);
        setError(null);
      } catch (err) {
        console.error(`Error fetching ${entityType}:`, err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [entityType, sortField, sortDirection, pageSize, transformItem, lastDoc]
  );

  // Fetch counts for filter pills
  const fetchCounts = useCallback(async () => {
    if (!db) return;

    try {
      const collectionRef = collection(db, entityType);
      const snapshot = await getDocs(collectionRef);

      const items = snapshot.docs.map((doc) => transformItem(doc) as T);
      const activeDocs = items.filter((item) => !(item as any).deletedAt);

      const newCounts: Record<string, number> = {
        all: activeDocs.length,
      };

      // Calculate status-specific counts based on entity type
      if (entityType === "employers") {
        newCounts.pending = activeDocs.filter((i) => ((i as any).status || "pending") === "pending").length;
        newCounts.approved = activeDocs.filter((i) => (i as any).status === "approved").length;
        newCounts.rejected = activeDocs.filter((i) => (i as any).status === "rejected").length;
      } else if (entityType === "vendors") {
        newCounts.pending = activeDocs.filter((i) => (i as any).status === "pending").length;
        newCounts.active = activeDocs.filter((i) => (i as any).status === "active").length;
        newCounts.inactive = activeDocs.filter(
          (i) => (i as any).status === "draft" || (i as any).status === "suspended"
        ).length;
        newCounts.featured = activeDocs.filter((i) => (i as any).featured === true).length;
      } else if (["jobs", "conferences", "powwows", "scholarships"].includes(entityType)) {
        newCounts.active = activeDocs.filter((i) => (i as any).active === true).length;
        newCounts.inactive = activeDocs.filter((i) => (i as any).active === false).length;
      } else if (entityType === "users") {
        newCounts.community = activeDocs.filter((i) => (i as any).role === "community").length;
        newCounts.employer = activeDocs.filter((i) => (i as any).role === "employer").length;
        newCounts.moderator = activeDocs.filter(
          (i) => (i as any).role === "moderator" || (i as any).role === "admin"
        ).length;
      }

      setCounts(newCounts);
    } catch (err) {
      console.error(`Error fetching ${entityType} counts:`, err);
    }
  }, [entityType, transformItem]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
    fetchCounts();
  }, []);

  // Refetch when sort changes
  useEffect(() => {
    if (!loading) {
      fetchItems();
    }
  }, [sortField, sortDirection]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let result = allItems;

    // Apply status filter
    result = result.filter((item) => filterFn(item, status));

    // Apply search filter
    if (search.trim() && searchFields.length > 0) {
      const searchLower = search.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    return result;
  }, [allItems, status, search, searchFields, filterFn]);

  // Paginated items for display
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, search]);

  // Actions
  const actions: AdminListActions = {
    setStatus: (newStatus) => setStatus(newStatus),
    setSearch: (newSearch) => setSearch(newSearch),
    setSort: (field, direction) => {
      if (field === sortField && !direction) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        if (direction) setSortDirection(direction);
      }
    },
    loadMore: async () => {
      if (!loadingMore && hasMore) {
        await fetchItems(true);
      }
    },
    refresh: async () => {
      setLastDoc(null);
      await fetchItems();
      await fetchCounts();
    },
    goToPage: (page) => {
      const maxPage = Math.ceil(filteredItems.length / pageSize);
      if (page >= 1 && page <= maxPage) {
        setCurrentPage(page);
      }
    },
    updateItem: (id, updates) => {
      setAllItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    removeItem: (id) => {
      setAllItems((prev) => prev.filter((item) => item.id !== id));
    },
  };

  return {
    state: {
      items: paginatedItems,
      filteredItems,
      total: allItems.filter((item) => !(item as any).deletedAt).length,
      filteredTotal: filteredItems.length,
      loading,
      loadingMore,
      error,
      hasMore: currentPage * pageSize < filteredItems.length,
      currentPage,
    },
    filters: {
      status,
      search,
      sortField,
      sortDirection,
    },
    actions,
    counts,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for managing selected items (for bulk actions)
 */
export function useSelectedItems<T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.size > 0,
  };
}
