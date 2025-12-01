import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import { SearchBar } from "@/components/shop/SearchBar";
import { searchVendors, getVendors } from "@/lib/firebase/vendors";
import { getNations, getNationBySlug } from "@/lib/firebase/nations";
import { getCategories } from "@/lib/firebase/categories";
import { SearchResultsClient } from "./SearchResultsClient";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q as string | undefined;
  const nation = params.nation as string | undefined;
  const category = params.category as string | undefined;

  let title = "Search | Shop Indigenous";
  let description = "Search for Indigenous vendors, artisans, and businesses.";

  if (query) {
    title = `"${query}" - Search Results | Shop Indigenous`;
    description = `Search results for "${query}" on Shop Indigenous.`;
  } else if (nation) {
    title = `${nation} Vendors | Shop Indigenous`;
    description = `Browse Indigenous vendors from ${nation}.`;
  } else if (category) {
    title = `${category} | Shop Indigenous`;
    description = `Browse Indigenous vendors in ${category}.`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export const revalidate = 60;

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const query = params.q as string | undefined;
  const nation = params.nation as string | undefined;
  const category = params.category as string | undefined;
  const region = params.region as string | undefined;
  const sortBy = (params.sort as string) || "relevance";

  // Fetch filter options and initial results in parallel
  const [categories, nationsByRegion, initialResults] = await Promise.all([
    getCategories(),
    getNations(),
    query
      ? searchVendors(query, 24)
      : getVendors(
          {
            nation: nation ? [nation] : undefined,
            category: category || undefined,
            region: region || undefined,
          },
          {
            sortBy: sortBy === "relevance" ? "popular" : (sortBy as any),
            limit: 24,
          }
        ).then((r) => r.vendors),
  ]);

  // Get nation details if filtering by nation
  let nationDetails = null;
  if (nation) {
    nationDetails = await getNationBySlug(nation);
  }

  // Build page title
  let pageTitle = "Search Results";
  let pageDescription: string | null = null;

  if (query) {
    pageTitle = `Results for "${query}"`;
  } else if (nationDetails) {
    pageTitle = `${nationDetails.name} Vendors`;
    pageDescription = nationDetails.description || null;
  } else if (region) {
    pageTitle = `${region} Vendors`;
  }

  return (
    <PageShell>
      {/* Header */}
      <header>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/shop" className="hover:text-[#14B8A6]">
            Shop Indigenous
          </Link>
          <span>/</span>
          <span className="text-slate-200">Search</span>
        </nav>

        {/* Search Bar */}
        <div className="mt-6">
          <SearchBar
            size="lg"
            autoFocus={!query}
            showAutocomplete={false}
          />
        </div>

        {/* Page Title */}
        <div className="mt-8">
          <h1 className="text-2xl font-bold text-slate-50 md:text-3xl">
            {pageTitle}
          </h1>
          {pageDescription && (
            <p className="mt-2 text-slate-400">{pageDescription}</p>
          )}
        </div>
      </header>

      {/* Active Filters */}
      {(query || nation || category || region) && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Filters:</span>

          {query && (
            <Link
              href="/shop/search"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/10 px-3 py-1.5 text-sm text-[#14B8A6]"
            >
              Query: {query}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          )}

          {nation && (
            <Link
              href={`/shop/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/10 px-3 py-1.5 text-sm text-[#14B8A6]"
            >
              Nation: {nationDetails?.name || nation}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          )}

          {category && (
            <Link
              href={`/shop/search${query ? `?q=${encodeURIComponent(query)}` : ""}${nation ? `${query ? "&" : "?"}nation=${nation}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/10 px-3 py-1.5 text-sm text-[#14B8A6]"
            >
              Category: {category}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          )}

          {region && (
            <Link
              href={`/shop/search${query ? `?q=${encodeURIComponent(query)}` : ""}${nation ? `${query ? "&" : "?"}nation=${nation}` : ""}${category ? `${query || nation ? "&" : "?"}category=${category}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/10 px-3 py-1.5 text-sm text-[#14B8A6]"
            >
              Region: {region}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          )}

          <Link
            href="/shop/search"
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Results Client Component */}
      <SearchResultsClient
        initialVendors={initialResults}
        categories={categories}
        nationsByRegion={nationsByRegion}
        initialQuery={query || ""}
        initialFilters={{
          nation: nation || undefined,
          category: category || undefined,
          region: region || undefined,
        }}
        initialSort={sortBy}
      />
    </PageShell>
  );
}
