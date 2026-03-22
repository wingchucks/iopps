export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--card-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--text-secondary)]">
        Showing {rangeStart}-{rangeEnd} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-foreground transition-colors hover:border-[var(--card-border-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-16 text-center text-sm text-[var(--text-secondary)]">
          {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-foreground transition-colors hover:border-[var(--card-border-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
