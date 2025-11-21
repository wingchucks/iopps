"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { globalSearch, type GlobalSearchResults } from "@/lib/firestore";
import { PageShell } from "@/components/PageShell";

import { Suspense } from "react";

function GlobalSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";

  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchResults = await globalSearch(query, 20);
        setResults(searchResults);
      } catch (err) {
        console.error("Search error:", err);
        setError("An error occurred while searching. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Search Results
          </h1>
          {query && (
            <p className="mt-2 text-lg text-slate-400">
              Showing results for: <span className="font-semibold text-[#14B8A6]">"{query}"</span>
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        )}

        {/* No Query */}
        {!loading && !query && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/40">
              <svg
                className="h-8 w-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200">
              Start searching
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Enter a search term to find jobs, scholarships, conferences, pow wows, and Indigenous businesses.
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && results && results.totalResults === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/40">
              <svg
                className="h-8 w-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200">
              No results found
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              We couldn't find anything matching "{query}". Try different keywords or check the spelling.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && results && results.totalResults > 0 && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="text-sm text-slate-400">
              Found {results.totalResults} result{results.totalResults === 1 ? "" : "s"} across{" "}
              {[
                results.jobs.length > 0 && "jobs",
                results.scholarships.length > 0 && "scholarships",
                results.conferences.length > 0 && "conferences",
                results.powwows.length > 0 && "pow wows",
                results.shop.length > 0 && "businesses",
              ]
                .filter(Boolean)
                .join(", ")}
            </div>

            {/* Jobs Section */}
            {results.jobs.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Jobs ({results.jobs.length})
                  </h2>
                  <Link
                    href={`/jobs?keyword=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    View all jobs →
                  </Link>
                </div>
                <div className="space-y-4">
                  {results.jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30 transition-all hover:-translate-y-1 hover:border-[#14B8A6]/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {job.employerName} • {job.location}
                          </p>
                          {job.description && (
                            <p className="mt-3 text-sm text-slate-300">
                              {job.description.slice(0, 150)}
                              {job.description.length > 150 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        {job.salaryRange && (
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-[#14B8A6]">
                              {job.salaryRange}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Scholarships Section */}
            {results.scholarships.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Scholarships ({results.scholarships.length})
                  </h2>
                  <Link
                    href={`/scholarships?keyword=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    View all scholarships →
                  </Link>
                </div>
                <div className="space-y-4">
                  {results.scholarships.map((scholarship) => (
                    <Link
                      key={scholarship.id}
                      href={`/scholarships/${scholarship.id}`}
                      className="block rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30 transition-all hover:-translate-y-1 hover:border-[#14B8A6]/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                            {scholarship.type}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold text-white">
                            {scholarship.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {scholarship.provider}
                          </p>
                          <p className="mt-3 text-sm text-slate-300">
                            {scholarship.description}
                          </p>
                        </div>
                        {scholarship.amount && (
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-[#14B8A6]">
                              {scholarship.amount}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Conferences Section */}
            {results.conferences.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Conferences ({results.conferences.length})
                  </h2>
                  <Link
                    href={`/conferences?keyword=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    View all conferences →
                  </Link>
                </div>
                <div className="space-y-4">
                  {results.conferences.map((conference) => (
                    <Link
                      key={conference.id}
                      href={`/conferences/${conference.id}`}
                      className="block rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30 transition-all hover:-translate-y-1 hover:border-[#14B8A6]/70"
                    >
                      <h3 className="text-xl font-semibold text-white">
                        {conference.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {conference.employerName} • {conference.location}
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        {conference.description.slice(0, 150)}
                        {conference.description.length > 150 ? "..." : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Pow Wows Section */}
            {results.powwows.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Pow Wows ({results.powwows.length})
                  </h2>
                  <Link
                    href={`/powwows?keyword=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    View all pow wows →
                  </Link>
                </div>
                <div className="space-y-4">
                  {results.powwows.map((powwow) => (
                    <Link
                      key={powwow.id}
                      href={`/powwows/${powwow.id}`}
                      className="block rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30 transition-all hover:-translate-y-1 hover:border-[#14B8A6]/70"
                    >
                      <h3 className="text-xl font-semibold text-white">
                        {powwow.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {powwow.host} • {powwow.location}
                      </p>
                      {powwow.description && (
                        <p className="mt-3 text-sm text-slate-300">
                          {powwow.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Indigenous Businesses Section */}
            {results.shop.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Indigenous Businesses ({results.shop.length})
                  </h2>
                  <Link
                    href={`/shop?keyword=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    View all businesses →
                  </Link>
                </div>
                <div className="space-y-4">
                  {results.shop.map((business) => (
                    <div
                      key={business.id}
                      className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[#14B8A6]">
                          ✓ Indigenous-owned
                        </span>
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                          {business.category}
                        </p>
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {business.name}
                      </h3>
                      {business.owner && (
                        <p className="mt-1 text-sm text-slate-400">
                          by {business.owner}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-slate-300">
                        {business.description && business.description.length > 150
                          ? `${business.description.slice(0, 150)}...`
                          : business.description}
                      </p>
                      {business.website && (
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-4 inline-flex rounded-full bg-[#14B8A6] px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
                        >
                          Visit shop
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-800 mb-8" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        </div>
      </PageShell>
    }>
      <GlobalSearchContent />
    </Suspense>
  );
}
