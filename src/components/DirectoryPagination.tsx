"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function replaceDirectoryQuery(params: URLSearchParams) {
  const query = params.toString();
  // These filters are entirely client-side. Read the current URL at event time so
  // rapid changes cannot restore stale filters while a router request is pending.
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

export function useDirectoryFilter(key: string, defaultValue: string) {
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;
  const setValue = useCallback((nextValue: string) => {
    const params = new URLSearchParams(window.location.search);
    if (!nextValue || nextValue === defaultValue) params.delete(key);
    else params.set(key, nextValue);
    params.delete("page");
    replaceDirectoryQuery(params);
  }, [defaultValue, key]);
  return [value, setValue] as const;
}

export function useDirectoryFilterActions() {
  return useCallback((updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    replaceDirectoryQuery(params);
  }, []);
}

export function useDirectoryPagination<T>(items: readonly T[], pageSize = 24) {
  const searchParams = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  const setPage = useCallback((nextPage: number) => {
    const params = new URLSearchParams(window.location.search);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(Math.min(nextPage, totalPages)));
    replaceDirectoryQuery(params);
    requestAnimationFrame(() => {
      const results = document.getElementById("directory-results");
      results?.scrollIntoView({ behavior: "smooth", block: "start" });
      results?.focus({ preventScroll: true });
    });
  }, [totalPages]);
  return { page, pageItems, totalPages, setPage };
}

export default function DirectoryPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Directory pages">
      <button
        type="button"
        className="rounded-xl border border-border button-gradient-soft px-4 py-2 font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous results page"
      >
        Previous
      </button>
      <span className="text-sm text-text-muted" aria-live="polite">
        {`Page ${page} of ${totalPages}`}
      </span>
      <button
        type="button"
        className="rounded-xl border border-border button-gradient-soft px-4 py-2 font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next results page"
      >
        Next
      </button>
    </nav>
  );
}
