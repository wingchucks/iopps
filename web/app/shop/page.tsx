"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listShopListings } from "@/lib/firestore";
import type { ShopListing } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";

// Sample data removed - using live data only

const categoryOptions = [
  "All",
  "Traditional Arts",
  "Jewelry & Beadwork",
  "Clothing & Accessories",
  "Food & Beverages",
  "Health & Wellness",
  "Cultural Experiences",
  "Education & Workshops",
  "Professional Services",
] as const;

function ShopContent() {
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  // URL-synced filter parameters
  const { params, updateParam, updateParams, resetParams } = useSearchParams({
    keyword: "",
    categoryFilter: "All" as typeof categoryOptions[number],
    locationFilter: "",
    shipsCanadaWide: false,
    onlineOnly: false,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listShopListings();
        setListings(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load Indigenous businesses right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const text = `${listing.name} ${listing.owner ?? ""} ${listing.description ?? ""
        } ${(listing.tags ?? []).join(" ")}`.toLowerCase();
      const matchesKeyword = text.includes(params.keyword.toLowerCase());
      const matchesCategory =
        params.categoryFilter === "All" ? true : listing.category === params.categoryFilter;
      const matchesLocation = params.locationFilter
        ? (listing.location ?? "")
          .toLowerCase()
          .includes(params.locationFilter.toLowerCase())
        : true;
      const matchesShipping = params.shipsCanadaWide
        ? Boolean(listing.shipsCanadaWide)
        : true;
      const matchesOnline = params.onlineOnly ? Boolean(listing.onlineStore) : true;
      return (
        matchesKeyword &&
        matchesCategory &&
        matchesLocation &&
        matchesShipping &&
        matchesOnline
      );
    });
  }, [
    params.categoryFilter,
    params.keyword,
    listings,
    params.locationFilter,
    params.onlineOnly,
    params.shipsCanadaWide,
  ]);

  const displayedListings = useMemo(
    () => filtered.slice(0, displayLimit),
    [displayLimit, filtered]
  );

  const hasMore = displayLimit < filtered.length;

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Shop Indigenous"
        title="Support Indigenous-owned businesses across Turtle Island"
        subtitle="Every purchase strengthens Indigenous economies, preserves cultural traditions, and builds pathways to economic reconciliation. Discover artisan goods, traditional services, cultural experiences, and community enterprises created by Indigenous makers and entrepreneurs."
      />

      {/* Quick filter chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => {
            updateParams({ categoryFilter: "Traditional Arts", keyword: "" });
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
        >
          Gifts & Art
        </button>
        <button
          onClick={() => {
            updateParams({ categoryFilter: "Professional Services", keyword: "" });
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
        >
          Services
        </button>
        <button
          onClick={() => {
            updateParams({ categoryFilter: "Food & Beverages", keyword: "" });
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
        >
          Food
        </button>
        <button
          onClick={() => {
            updateParams({ categoryFilter: "Health & Wellness", keyword: "" });
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
        >
          Wellness
        </button>
        <button
          onClick={() => {
            updateParams({ categoryFilter: "Cultural Experiences", keyword: "" });
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
        >
          Experiences
        </button>
      </div>

      <FilterCard className="mt-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={params.keyword}
              onChange={(e) => updateParam("keyword", e.target.value)}
              placeholder="Pottery, language courses, traditional foods..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Category
            </label>
            <select
              value={params.categoryFilter}
              onChange={(e) =>
                updateParam("categoryFilter",
                  e.target.value as (typeof categoryOptions)[number]
                )
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={params.locationFilter}
              onChange={(e) => updateParam("locationFilter", e.target.value)}
              placeholder="Seattle, Thunder Bay, Santa Fe, Virtual..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={params.shipsCanadaWide}
              onChange={(e) => updateParam("shipsCanadaWide", e.target.checked)}
            />
            Shipping Worldwide
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={params.onlineOnly}
              onChange={(e) => updateParam("onlineOnly", e.target.checked)}
            />
            Online only
          </label>
          <button
            type="button"
            onClick={() => {
              resetParams();
              setDisplayLimit(20);
            }}
            className="text-xs font-semibold text-[#14B8A6] underline"
          >
            Reset filters
          </button>
        </div>
      </FilterCard>

      <section className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        ) : listings.length === 0 && params.keyword === "" && params.categoryFilter === "All" && params.locationFilter === "" && !params.shipsCanadaWide && !params.onlineOnly ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-200">No Indigenous businesses listed yet</h3>
            <p className="mt-3 text-sm text-slate-400">
              Check back soon! Indigenous vendors and businesses are joining the platform daily.
            </p>
            <Link
              href="/vendor/setup"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              List your Indigenous business
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No businesses match your filters yet. Try adjusting category or location, or check back soon as new vendors join each week.
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-slate-400">
              Showing {displayedListings.length} of {filtered.length} business{filtered.length === 1 ? "" : "es"}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {displayedListings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Indigenous-owned badge */}
                      <span className="rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[#14B8A6]">
                        ✓ Indigenous-owned
                      </span>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                        {listing.category}
                      </p>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-50">
                      {listing.name}
                    </h3>
                    {listing.owner && (
                      <p className="text-sm text-slate-300">
                        by {listing.owner}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">{listing.location}</span>
                      {listing.shipsCanadaWide && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400">Shipping Worldwide</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    {listing.description && listing.description.length > 150
                      ? `${listing.description.slice(0, 150)}...`
                      : listing.description}
                  </p>
                  {(listing.tags ?? []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(listing.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="text-[0.65rem] text-slate-400"
                        >
                          {tag}
                          {tag !== listing.tags![listing.tags!.length - 1] && " ·"}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing.website && (
                      <a
                        href={listing.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-[#14B8A6] px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
                      >
                        Visit shop
                      </a>
                    )}
                    {listing.vendorId && (
                      <Link
                        href={`/shop/${listing.vendorId}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                      >
                        View profile
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 20)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-[#08090C] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
                >
                  Load more businesses
                  <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Vendor CTA */}
      <section className="mt-12 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              For Indigenous entrepreneurs
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              List your Indigenous-owned business on IOPPS
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Reach community members across Turtle Island with your products, services, or cultural experiences. Join our growing marketplace of Indigenous makers and entrepreneurs.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/vendor/setup"
              className="rounded-full bg-[#14B8A6] px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
            >
              Set up vendor profile
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="mx-auto max-w-7xl">
          <div className="h-32 w-full animate-pulse rounded-xl bg-slate-900/60 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-slate-800/80 bg-[#08090C]"
              />
            ))}
          </div>
        </div>
      </PageShell>
    }>
      <ShopContent />
    </Suspense>
  );
}
