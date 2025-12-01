"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import {
  CategoryFilter,
  MobileFilterDrawer,
} from "@/components/shop/CategoryFilter";
import type { CategoryWithChildren } from "@/lib/firebase/categories";
import type { NationsByRegion } from "@/lib/firebase/nations";
import type { Vendor, VendorFilters, VendorSortOption } from "@/lib/firebase/vendors";
import { getVendors } from "@/lib/firebase/vendors";

interface CategoryPageClientProps {
  category: CategoryWithChildren;
  nations: NationsByRegion[];
  initialVendors: Vendor[];
  initialHasMore: boolean;
  initialFilters: {
    subcategory?: string;
    nations?: string[];
    regions?: string[];
    priceRange?: string;
    customOrdersOnly?: boolean;
  };
  initialSort: string;
  materialOptions: string[];
  techniqueOptions: string[];
}

export function CategoryPageClient({
  category,
  nations,
  initialVendors,
  initialHasMore,
  initialFilters,
  initialSort,
  materialOptions,
  techniqueOptions,
}: CategoryPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState(initialSort);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Count active filters
  const activeFilterCount =
    (filters.subcategory ? 1 : 0) +
    (filters.nations?.length || 0) +
    (filters.regions?.length || 0) +
    (filters.priceRange ? 1 : 0) +
    (filters.customOrdersOnly ? 1 : 0);

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: typeof filters, newSort: string) => {
      const params = new URLSearchParams();

      if (newFilters.subcategory) {
        params.set("subcategory", newFilters.subcategory);
      }

      if (newFilters.nations && newFilters.nations.length > 0) {
        newFilters.nations.forEach((n) => params.append("nation", n));
      }

      if (newFilters.regions && newFilters.regions.length > 0) {
        newFilters.regions.forEach((r) => params.append("region", r));
      }

      if (newFilters.priceRange) {
        params.set("priceRange", newFilters.priceRange);
      }

      if (newFilters.customOrdersOnly) {
        params.set("customOrders", "true");
      }

      if (newSort && newSort !== "newest") {
        params.set("sort", newSort);
      }

      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  // Fetch vendors when filters change
  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getVendors(
        {
          category: filters.subcategory || category.id,
          nation: filters.nations,
          region: filters.regions?.[0],
          priceRange: filters.priceRange as any,
          customOrdersOnly: filters.customOrdersOnly,
        },
        {
          sortBy: sortBy as VendorSortOption,
          limit: 12,
        }
      );

      setVendors(result.vendors);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, category.id]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);
      updateURL(newFilters, sortBy);
    },
    [sortBy, updateURL]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSort: string) => {
      setSortBy(newSort);
      updateURL(filters, newSort);
    },
    [filters, updateURL]
  );

  // Load more vendors
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getVendors(
        {
          category: filters.subcategory || category.id,
          nation: filters.nations,
          region: filters.regions?.[0],
          priceRange: filters.priceRange as any,
          customOrdersOnly: filters.customOrdersOnly,
        },
        {
          sortBy: sortBy as VendorSortOption,
          limit: 12,
          // In a real implementation, we'd pass the cursor here
        }
      );

      setVendors((prev) => [...prev, ...result.vendors]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading more vendors:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    filters,
    sortBy,
    category.id,
    hasMore,
    isLoadingMore,
  ]);

  // Refetch when filters change
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <>
      {/* Main Content */}
      <div className="mt-8 flex gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Filters
            </h2>
            <CategoryFilter
              categories={[category]}
              nations={nations}
              activeFilters={filters}
              onFilterChange={handleFilterChange}
              materialOptions={materialOptions}
              techniqueOptions={techniqueOptions}
            />
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
                : `Showing ${vendors.length} vendor${vendors.length !== 1 ? "s" : ""}`}
            </p>

            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="relative flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 md:hidden"
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
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">
                No vendors match your filters
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Try adjusting your filters or browse all vendors in this
                category.
              </p>
              <button
                onClick={() => handleFilterChange({})}
                className="mt-4 text-sm font-medium text-[#14B8A6] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-[#08090C] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6] disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        Load more
                        <svg
                          className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        categories={[category]}
        nations={nations}
        activeFilters={filters}
        onFilterChange={(newFilters) => {
          handleFilterChange(newFilters);
          setIsMobileFilterOpen(false);
        }}
        materialOptions={materialOptions}
        techniqueOptions={techniqueOptions}
      />
    </>
  );
}
