/**
 * Admin Hooks
 *
 * Centralized data management hooks for the admin panel.
 * These hooks ensure consistent data fetching and state management
 * across all admin pages.
 */

export {
  useAdminCounts,
  useEntityCounts,
  getTotalPending,
  getChangeIndicator,
  type AdminCountsState,
  type UseAdminCountsReturn,
} from "./useAdminCounts";

export {
  useAdminList,
  useSelectedItems,
  type AdminListConfig,
  type AdminListState,
  type AdminListFilters,
  type AdminListActions,
  type UseAdminListReturn,
} from "./useAdminList";
