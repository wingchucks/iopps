/**
 * IOPPS Global Search Page — Social Feed Pattern
 *
 * Search results displayed in the unified feed layout.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { globalSearch, type GlobalSearchResults } from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import {
  FeedLayout,
  SectionHeader,
  colors,
  Icon,
} from "@/components/opportunity-graph";

function formatSalaryRange(salaryRange: JobPosting["salaryRange"]): string {
  if (!salaryRange) return "";
  if (typeof salaryRange === "string") return salaryRange;
  if (!salaryRange.disclosed) return "";
  const { min, max, currency = "CAD" } = salaryRange;
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
  if (min) return `$${min.toLocaleString()}+ ${currency}`;
  if (max) return `Up to $${max.toLocaleString()} ${currency}`;
  return "";
}

const cardStyle = {
  display: "block",
  background: colors.surface,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  padding: 20,
  marginBottom: 12,
  textDecoration: "none" as const,
  transition: "border-color 0.15s, box-shadow 0.15s",
};

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
    <FeedLayout>
      <SectionHeader
        title={query ? `Results for "${query}"` : "Search"}
        subtitle={
          loading
            ? "Searching..."
            : results
              ? `Found ${results.totalResults} result${results.totalResults === 1 ? "" : "s"}`
              : "Search jobs, scholarships, conferences, pow wows, and Indigenous businesses."
        }
        icon="🔍"
        count={results?.totalResults}
      />

      {/* Error */}
      {error && (
        <div
          style={{
            background: colors.redBg,
            border: `1px solid ${colors.red}33`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            fontSize: 14,
            color: colors.red,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading &&
        [1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              height: 100,
              marginBottom: 12,
              animation: "ioppsPulse 1.5s ease-in-out infinite",
            }}
          />
        ))}

      {/* No query */}
      {!loading && !query && (
        <div
          style={{
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: 48,
            textAlign: "center",
          }}
        >
          <Icon name="search" size={40} color={colors.textFaint} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: "16px 0 8px" }}>
            Start searching
          </h3>
          <p style={{ fontSize: 14, color: colors.textSoft }}>
            Use the search bar above to find jobs, scholarships, conferences, pow wows, and Indigenous businesses.
          </p>
        </div>
      )}

      {/* No results */}
      {!loading && results && results.totalResults === 0 && (
        <div
          style={{
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: 48,
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: "0 0 8px" }}>
            No results found
          </h3>
          <p style={{ fontSize: 14, color: colors.textSoft }}>
            We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try different keywords.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && results && results.totalResults > 0 && (
        <div>
          {/* Jobs */}
          {results.jobs.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>💼</span> Jobs ({results.jobs.length})
              </h2>
              {results.jobs.map((job) => (
                <Link key={job.id} href={`/careers/${job.id}`} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{job.title}</div>
                  <div style={{ fontSize: 13, color: colors.textSoft, marginTop: 4 }}>
                    {job.employerName} · {job.location}
                  </div>
                  {formatSalaryRange(job.salaryRange) && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent, marginTop: 4 }}>
                      {formatSalaryRange(job.salaryRange)}
                    </div>
                  )}
                </Link>
              ))}
            </section>
          )}

          {/* Scholarships */}
          {results.scholarships.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🏆</span> Scholarships ({results.scholarships.length})
              </h2>
              {results.scholarships.map((s) => (
                <Link key={s.id} href={`/education/scholarships/${s.id}`} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: colors.textSoft, marginTop: 4 }}>{s.provider}</div>
                  {s.amount && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.amber, marginTop: 4 }}>{s.amount}</div>
                  )}
                </Link>
              ))}
            </section>
          )}

          {/* Conferences */}
          {results.conferences.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎤</span> Conferences ({results.conferences.length})
              </h2>
              {results.conferences.map((c) => (
                <Link key={c.id} href={`/conferences/${c.id}`} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: colors.textSoft, marginTop: 4 }}>
                    {c.employerName} · {c.location}
                  </div>
                </Link>
              ))}
            </section>
          )}

          {/* Pow Wows */}
          {results.powwows.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>📅</span> Pow Wows ({results.powwows.length})
              </h2>
              {results.powwows.map((p) => (
                <Link key={p.id} href={`/community/${p.id}`} style={cardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: colors.textSoft, marginTop: 4 }}>
                    {p.host} · {p.location}
                  </div>
                </Link>
              ))}
            </section>
          )}

          {/* Businesses */}
          {results.shop.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🛍</span> Businesses ({results.shop.length})
              </h2>
              {results.shop.map((b) => (
                <div key={b.id} style={{ ...cardStyle, cursor: "default" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{b.businessName}</div>
                  <div style={{ fontSize: 13, color: colors.textSoft, marginTop: 4 }}>
                    {b.nation} · {b.category}
                  </div>
                  {b.website && (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 8,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: colors.accentBg,
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Visit shop →
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </FeedLayout>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense
      fallback={
        <FeedLayout>
          <SectionHeader title="Search" subtitle="Loading..." icon="🔍" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                height: 100,
                marginBottom: 12,
                animation: "ioppsPulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </FeedLayout>
      }
    >
      <GlobalSearchContent />
    </Suspense>
  );
}
