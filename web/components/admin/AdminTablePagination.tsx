"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export interface AdminTablePaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminTablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  showPageSizeSelector = false,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  loading = false,
}: AdminTablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Results summary */}
      <div className="text-sm text-[var(--text-muted)]">
        Showing{" "}
        <span className="font-medium text-foreground">{startItem}</span>
        {" - "}
        <span className="font-medium text-foreground">{endItem}</span>
        {" of "}
        <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span>
        {" results"}
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-[var(--text-muted)]">
              Per page:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="rounded-md border border-[var(--card-border)] bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pagination controls */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="inline-flex items-center justify-center rounded-md border border-[var(--card-border)] p-2 text-[var(--text-muted)] transition-colors hover:border-[var(--card-border)] hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            {pageNumbers.map((page, index) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-foreground0"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={loading}
                  className={`min-w-[36px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    currentPage === page
                      ? "bg-accent text-[var(--text-primary)]"
                      : "border border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--card-border)] hover:bg-surface hover:text-foreground"
                  }`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Mobile page indicator */}
          <div className="flex items-center gap-2 px-2 sm:hidden">
            <span className="text-sm text-[var(--text-muted)]">
              Page{" "}
              <span className="font-medium text-foreground">{currentPage}</span>
              {" of "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="inline-flex items-center justify-center rounded-md border border-[var(--card-border)] p-2 text-[var(--text-muted)] transition-colors hover:border-[var(--card-border)] hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}

// ============================================================================
// Simple Pagination (Previous/Next only)
// ============================================================================

export interface SimplePaginationProps {
  /** Has more items to load */
  hasMore: boolean;
  /** Has previous items */
  hasPrevious: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback for next page */
  onNext: () => void;
  /** Callback for previous page */
  onPrevious: () => void;
}

export function SimplePagination({
  hasMore,
  hasPrevious,
  loading = false,
  onNext,
  onPrevious,
}: SimplePaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--card-border)] hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <button
        onClick={onNext}
        disabled={!hasMore || loading}
        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Loading..." : "Load More"}
      </button>
    </div>
  );
}
