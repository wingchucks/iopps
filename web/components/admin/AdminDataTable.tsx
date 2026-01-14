"use client";

import { ReactNode, useState, useCallback } from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
}

export interface AdminDataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectChange?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  // Sorting
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  // Row actions
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  // Rendering
  renderActions?: (row: T) => ReactNode;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {[...Array(5)].map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {[...Array(columns)].map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-4 rounded bg-slate-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function TableEmptyState({
  message,
  description,
  colSpan,
}: {
  message: string;
  description?: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
          <svg
            className="h-6 w-6 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-300">{message}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminDataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "No items found",
  emptyDescription,
  selectable = false,
  selectedIds = new Set(),
  onSelectChange,
  onSelectAll,
  onClearSelection,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  rowClassName,
  renderActions,
}: AdminDataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectAllClick = useCallback(() => {
    if (allSelected || someSelected) {
      onClearSelection?.();
    } else {
      onSelectAll?.();
    }
  }, [allSelected, someSelected, onSelectAll, onClearSelection]);

  const getAlignmentClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sortField !== columnId) {
      return <ChevronUpDownIcon className="ml-1 h-4 w-4 text-slate-600" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="ml-1 h-4 w-4 text-teal-400" />
    ) : (
      <ChevronDownIcon className="ml-1 h-4 w-4 text-teal-400" />
    );
  };

  const totalColumns = columns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              {/* Selection checkbox column */}
              {selectable && (
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAllClick}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                  />
                </th>
              )}

              {/* Data columns */}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 ${getAlignmentClass(
                    column.align
                  )} ${column.headerClassName || ""}`}
                  style={{ width: column.width }}
                >
                  {column.sortable && onSort ? (
                    <button
                      onClick={() => onSort(column.id)}
                      className="inline-flex items-center hover:text-slate-200 transition-colors"
                    >
                      {column.header}
                      {getSortIcon(column.id)}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}

              {/* Actions column */}
              {renderActions && (
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <TableSkeleton columns={totalColumns} />
            ) : data.length === 0 ? (
              <TableEmptyState
                message={emptyMessage}
                description={emptyDescription}
                colSpan={totalColumns}
              />
            ) : (
              data.map((row) => {
                const isSelected = selectedIds.has(row.id);
                const isHovered = hoveredRow === row.id;
                const customRowClass = rowClassName?.(row) || "";

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-teal-500/5"
                        : isHovered
                        ? "bg-slate-800/50"
                        : "hover:bg-slate-800/30"
                    } ${onRowClick ? "cursor-pointer" : ""} ${customRowClass}`}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectChange?.(row.id)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => {
                      let content: ReactNode;
                      if (column.accessorFn) {
                        content = column.accessorFn(row);
                      } else if (column.accessorKey) {
                        content = row[column.accessorKey] as ReactNode;
                      } else {
                        content = null;
                      }

                      return (
                        <td
                          key={column.id}
                          className={`px-6 py-4 text-sm ${getAlignmentClass(
                            column.align
                          )} ${column.cellClassName || ""}`}
                        >
                          {content}
                        </td>
                      );
                    })}

                    {/* Actions cell */}
                    {renderActions && (
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Bulk Actions Bar
// ============================================================================

export interface BulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "danger";
  onClick: () => void;
}

export interface AdminBulkActionsProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
}

export function AdminBulkActions({
  selectedCount,
  actions,
  onClearSelection,
}: AdminBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
      <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-lg">
        <span className="text-sm text-slate-300">
          <span className="font-semibold text-teal-400">{selectedCount}</span> selected
        </span>
        <div className="h-4 w-px bg-slate-700" />
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              action.variant === "danger"
                ? "text-red-400 hover:bg-red-500/10"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <div className="h-4 w-px bg-slate-700" />
        <button
          onClick={onClearSelection}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
