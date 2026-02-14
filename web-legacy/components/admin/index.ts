// Admin shared components
// ============================================================================
// State & Display Components
// ============================================================================
export { AdminLoadingState } from "./AdminLoadingState";
export { AdminEmptyState } from "./AdminEmptyState";
export { StatusBadge } from "./StatusBadge";
export { AdminFilterButtons } from "./AdminFilterButtons";
export { AdminSearchInput } from "./AdminSearchInput";

// ============================================================================
// Data Table Components
// ============================================================================
export {
  AdminDataTable,
  AdminBulkActions,
  type ColumnDef,
  type AdminDataTableProps,
  type BulkAction,
  type AdminBulkActionsProps,
} from "./AdminDataTable";

export {
  AdminTablePagination,
  SimplePagination,
  type AdminTablePaginationProps,
  type SimplePaginationProps,
} from "./AdminTablePagination";

// ============================================================================
// Action Components
// ============================================================================
export {
  EntityActionsMenu,
  ModerationActionsMenu,
  type ActionItem,
  type ActionGroup,
  type EntityActionsMenuProps,
  type ModerationActionsProps,
} from "./EntityActionsMenu";

export {
  ConfirmationModal,
  DeleteModal,
  ApprovalModal,
  StatusChangeModal,
  useConfirmation,
  type ConfirmationModalProps,
  type ConfirmationVariant,
  type DeleteModalProps,
  type ApprovalModalProps,
  type StatusChangeModalProps,
  type UseConfirmationReturn,
} from "./ConfirmationModal";

// ============================================================================
// Dashboard Components
// ============================================================================
export {
  QueueCard,
  QueueGrid,
  type QueueType,
  type QueueItem,
  type QueueCardProps,
  type QueueGridProps,
} from "./QueueCard";

export {
  KPICard,
  KPIGrid,
  type KPIColor,
  type KPICardProps,
  type KPIGridProps,
} from "./KPICard";

export {
  ActivityFeed,
  CompactActivityList,
  type ActivityType,
  type ActivityItem,
  type ActivityFeedProps,
  type CompactActivityListProps,
} from "./ActivityFeed";

export {
  SystemHealthPanel,
  CompactHealthIndicator,
  checkEmailService,
  checkStripeService,
  buildRSSHealthItem,
  type HealthStatus,
  type HealthItem,
  type SystemHealthPanelProps,
  type CompactHealthIndicatorProps,
  type ServiceCheckResult,
} from "./SystemHealthPanel";

// ============================================================================
// Shell & Navigation Components
// ============================================================================
export {
  AdminNavGroup,
  SingleNavItem,
  type NavItem,
  type AdminNavGroupProps,
  type SingleNavItemProps,
} from "./AdminNavGroup";

export { AdminTopBar, type AdminTopBarProps } from "./AdminTopBar";
