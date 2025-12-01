"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import type { CategoryWithChildren } from "@/lib/firebase/categories";
import type { NationsByRegion } from "@/lib/firebase/nations";
import type { Vendor, VendorSortOption } from "@/lib/firebase/vendors";
import { searchVendors, getVendors } from "@/lib/firebase/vendors";

interface SearchResultsClientProps {
  initialVendors: Vendor[];
  categories: CategoryWithChildren[];
  nationsByRegion: NationsByRegion[];
  initialQuery: string;
  initialFilters: {
    nation?: string;
    category?: string;
    region?: string;
  };
  initialSort: string;
}

export function SearchResultsClient({
  initialVendors,
  categories,
  nationsByRegion,
  initialQuery,
  initialFilters,
  initialSort,
}: SearchResultsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState(initialSort);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Count active filters
  const activeFilterCount =
    (filters.nation ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.region ? 1 : 0);

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: typeof filters, newSort: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // Preserve query
      const query = params.get("q");

      // Clear filter params
      params.delete("nation");
      params.delete("category");
      params.delete("region");
      params.delete("sort");

      // Set new filters
      if (newFilters.nation) {
        params.set("nation", newFilters.nation);
      }
      if (newFilters.category) {
        params.set("category", newFilters.category);
      }
      if (newFilters.region) {
        params.set("region", newFilters.region);
      }
      if (newSort && newSort !== "relevance") {
        params.set("sort", newSort);
      }

      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  // Fetch vendors when filters change
  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = searchParams.get("q") || "";

      let results: Vendor[];

      if (query) {
        // Text search
        results = await searchVendors(query, 24);

        // Apply filters client-side for text search results
        if (filters.nation) {
          results = results.filter(
            (v) => v.nation?.toLowerCase().includes(filters.nation!.toLowerCase())
          );
        }
        if (filters.category) {
          results = results.filter((v) =>
            v.categories?.some((c) =>
              c.toLowerCase().includes(filters.category!.toLowerCase())
            )
          );
        }
        if (filters.region) {
          results = results.filter(
            (v) => v.region?.toLowerCase() === filters.region!.toLowerCase()
          );
        }
      } else {
        // Filter-based search
        const result = await getVendors(
          {
            nation: filters.nation ? [filters.nation] : undefined,
            category: filters.category || undefined,
            region: filters.region || undefined,
          },
          {
            sortBy:
              sortBy === "relevance" ? "popular" : (sortBy as VendorSortOption),
            limit: 24,
          }
        );
        results = result.vendors;
      }

      setVendors(results);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, searchParams]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof typeof filters, value: string | undefined) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      updateURL(newFilters, sortBy);
    },
    [filters, sortBy, updateURL]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSort: string) => {
      setSortBy(newSort);
      updateURL(filters, newSort);
    },
    [filters, updateURL]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    const newFilters = {
      nation: undefined,
      category: undefined,
      region: undefined,
    };
    setFilters(newFilters);
    updateURL(newFilters, "relevance");
  }, [updateURL]);

  // Refetch when filters change
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <div className="mt-8 flex gap-8">
      {/* Desktop Filter Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#14B8A6] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="border-t border-slate-800 py-4">
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Category
            </label>
            <select
              value={filters.category || ""}
              onChange={(e) =>
                handleFilterChange("category", e.target.value || undefined)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  <option value={cat.id}>{cat.name}</option>
                  {cat.subcategories?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div className="border-t border-slate-800 py-4">
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Region
            </label>
            <select
              value={filters.region || ""}
              onChange={(e) =>
                handleFilterChange("region", e.target.value || undefined)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">All Regions</option>
              {nationsByRegion.map((group) => (
                <option key={group.region} value={group.region}>
                  {group.region}
                </option>
              ))}
            </select>
          </div>

          {/* Nation Filter */}
          <div className="border-t border-slate-800 py-4">
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Nation / Tribe
            </label>
            <select
              value={filters.nation || ""}
              onChange={(e) =>
                handleFilterChange("nation", e.target.value || undefined)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">All Nations</option>
              {nationsByRegion.map((group) => (
                <optgroup key={group.region} label={group.region}>
                  {group.nations.map((nation) => (
                    <option key={nation.id} value={nation.slug}>
                      {nation.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Results */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Results Count */}
          <p className="text-sm text-slate-400">
            {isLoading
              ? "Loading..."
              : `Found ${vendors.length} vendor${vendors.length !== 1 ? "s" : ""}`}
          </p>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 lg:hidden"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#14B8A6] text-xs font-semibold text-slate-900">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <VendorCardSkeleton key={i} />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-200">
              No results found
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Try adjusting your search or filters to find what you&apos;re looking
              for.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-[#14B8A6] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#08090C] p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Filters</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value || undefined)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    <option value={cat.id}>{cat.name}</option>
                    {cat.subcategories?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Region
              </label>
              <select
                value={filters.region || ""}
                onChange={(e) =>
                  handleFilterChange("region", e.target.value || undefined)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="">All Regions</option>
                {nationsByRegion.map((group) => (
                  <option key={group.region} value={group.region}>
                    {group.region}
                  </option>
                ))}
              </select>
            </div>

            {/* Nation Filter */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Nation / Tribe
              </label>
              <select
                value={filters.nation || ""}
                onChange={(e) =>
                  handleFilterChange("nation", e.target.value || undefined)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="">All Nations</option>
                {nationsByRegion.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.nations.map((nation) => (
                      <option key={nation.id} value={nation.slug}>
                        {nation.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
