"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { displayAmount, displayLocation } from "@/lib/utils";

interface PublicScholarship {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  eligibility?: string;
  amount?: unknown;
  deadline?: string;
  orgId?: string;
  orgName?: string;
  ownerType?: "school" | "business" | "organization" | "unknown";
  ownerSlug?: string;
  isPartner?: boolean;
  partnerTier?: "standard" | "premium" | "school";
  partnerLabel?: string;
  partnerBadgeLabel?: string;
  applicationUrl?: string;
  location?: unknown;
  featured?: boolean;
}

function isClosingSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  const diff = date.getTime() - Date.now();
  return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000;
}

function getSourceLabel(ownerType?: PublicScholarship["ownerType"]) {
  switch (ownerType) {
    case "school":
      return "School Scholarship";
    case "business":
      return "Employer Scholarship";
    case "organization":
      return "Organization Scholarship";
    default:
      return "Scholarship";
  }
}

export default function ScholarshipsBrowsePage() {
  const [scholarships, setScholarships] = useState<PublicScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");
  const [closingSoonOnly, setClosingSoonOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/scholarships");
        const payload = response.ok ? await response.json() : { scholarships: [] };
        setScholarships((payload.scholarships || []) as PublicScholarship[]);
      } catch (err) {
        console.error("Failed to load scholarships:", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const eligibilities = useMemo(
    () => [...new Set(scholarships.map((scholarship) => scholarship.eligibility).filter(Boolean))] as string[],
    [scholarships],
  );

  const filtered = useMemo(() => {
    let result = scholarships;
    if (search) {
      const query = search.toLowerCase();
      result = result.filter((scholarship) =>
        scholarship.title.toLowerCase().includes(query) ||
        (scholarship.orgName || "").toLowerCase().includes(query) ||
        (scholarship.eligibility || "").toLowerCase().includes(query) ||
        (scholarship.description || "").toLowerCase().includes(query),
      );
    }
    if (eligibilityFilter) {
      result = result.filter((scholarship) => scholarship.eligibility === eligibilityFilter);
    }
    if (closingSoonOnly) {
      result = result.filter((scholarship) => isClosingSoon(scholarship.deadline));
    }
    return result;
  }, [closingSoonOnly, eligibilityFilter, scholarships, search]);

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--gold), var(--navy))",
            padding: "clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px)",
          }}
        >
          <div className="mx-auto max-w-[1200px] text-center">
            <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-5xl">Scholarships</h1>
            <p className="mx-auto mb-0 max-w-[680px] text-base text-white/75 sm:text-lg">
              Financial support from schools, employers, and organizations for Indigenous students and learners.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <input
              type="text"
              placeholder="Search scholarships..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <select
              value={eligibilityFilter}
              onChange={(event) => setEligibilityFilter(event.target.value)}
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="">All Eligibility</option>
              {eligibilities.map((eligibility) => (
                <option key={eligibility} value={eligibility}>
                  {eligibility}
                </option>
              ))}
            </select>
            <button
              onClick={() => setClosingSoonOnly(!closingSoonOnly)}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition-all"
              style={{
                background: closingSoonOnly ? "var(--gold)" : "var(--card)",
                border: closingSoonOnly ? "1.5px solid var(--gold)" : "1.5px solid var(--border)",
                color: closingSoonOnly ? "#fff" : "var(--text)",
              }}
            >
              &#9200; Closing Soon
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-[280px] rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-16 text-center"
              style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
            >
              <p className="mb-4 text-5xl">&#127891;</p>
              <h2 className="mb-2 text-xl font-extrabold text-text">No Scholarships Found</h2>
              <p className="mb-6 text-sm text-text-sec">
                {search || eligibilityFilter || closingSoonOnly
                  ? "Try adjusting your filters to find more scholarships."
                  : "There are no scholarships listed right now. Check back soon!"}
              </p>
              <Link
                href="/feed"
                className="inline-block rounded-xl px-6 py-3 text-sm font-bold text-white no-underline"
                style={{ background: "var(--gold)" }}
              >
                Back to Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((scholarship) => {
                const slug = scholarship.slug || scholarship.id;
                const closingSoon = isClosingSoon(scholarship.deadline);
                const amountLabel = displayAmount(scholarship.amount) || "Funding varies";
                const deadlineLabel = scholarship.deadline || "Check provider for deadline";
                const sourceLabel = getSourceLabel(scholarship.ownerType);

                return (
                  <Link
                    key={scholarship.id}
                    href={`/scholarships/${slug}`}
                    className="no-underline group"
                  >
                    <div
                      className="flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-200"
                      style={{
                        background: "var(--card)",
                        border: "1.5px solid var(--border)",
                      }}
                    >
                      <div className="h-1.5" style={{ background: "var(--gold)" }} />
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className="inline-block rounded-xl px-3 py-1.5 text-sm font-extrabold"
                            style={{
                              color: scholarship.amount ? "var(--gold)" : "var(--text-sec)",
                              background: scholarship.amount ? "var(--gold-soft)" : "var(--border)",
                            }}
                          >
                            {amountLabel}
                          </span>
                          {closingSoon && (
                            <span
                              className="inline-block rounded-lg px-2 py-1 text-[10px] font-bold"
                              style={{ color: "var(--red)", background: "var(--red-soft)" }}
                            >
                              Closing Soon
                            </span>
                          )}
                        </div>

                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--gold)" }}>
                          {sourceLabel}
                        </p>
                        {scholarship.isPartner && (
                          <p className="mb-2 text-[11px] font-semibold" style={{ color: scholarship.partnerTier === "premium" ? "var(--gold)" : scholarship.partnerTier === "school" ? "var(--blue)" : "var(--teal)" }}>
                            {scholarship.partnerBadgeLabel || scholarship.partnerLabel}
                          </p>
                        )}
                        <h3 className="m-0 mb-2 text-[15px] font-bold text-text transition-colors group-hover:text-gold">
                          {scholarship.title}
                        </h3>

                        {scholarship.orgName && (
                          <p className="m-0 mb-2 text-xs text-text-sec">{scholarship.orgName}</p>
                        )}

                        {scholarship.eligibility && (
                          <p className="m-0 mb-3 line-clamp-2 text-xs leading-relaxed text-text-muted">
                            {scholarship.eligibility}
                          </p>
                        )}

                        <div className="mt-auto flex flex-col gap-1.5">
                          <p className="m-0 flex items-center gap-1.5 text-xs text-text-sec">
                            <span>&#128197;</span> {deadlineLabel}
                          </p>
                          {Boolean(scholarship.location) && (
                            <p className="m-0 flex items-center gap-1.5 text-xs text-text-sec">
                              <span>&#128205;</span> {displayLocation(scholarship.location)}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 border-t border-border pt-3">
                          <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>
                            View Scholarship &#8594;
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
