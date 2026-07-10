"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useDirectoryFilter(key: string, defaultValue: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;
  const setValue = useCallback((nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextValue || nextValue === defaultValue) params.delete(key);
    else params.set(key, nextValue);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [defaultValue, key, pathname, router, searchParams]);
  return [value, setValue] as const;
}

export function useDirectoryFilterActions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback((updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
}

export function useDirectoryPagination<T>(items: readonly T[], pageSize = 24) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  const setPage = useCallback((nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(Math.min(nextPage, totalPages)));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    requestAnimationFrame(() => {
      const results = document.getElementById("directory-results");
      results?.scrollIntoView({ behavior: "smooth", block: "start" });
      results?.focus({ preventScroll: true });
    });
  }, [pathname, router, searchParams, totalPages]);
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
        className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous results page"
      >
        Previous
      </button>
      <span className="text-sm text-text-muted" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next results page"
      >
        Next
      </button>
    </nav>
  );
}
