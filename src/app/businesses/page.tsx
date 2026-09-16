"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import DirectoryPagination, { useDirectoryFilter, useDirectoryFilterActions, useDirectoryPagination } from "@/components/DirectoryPagination";
import { type Organization } from "@/lib/firestore/organizations";
import { hasOrganizationIndigenousIdentity } from "@/lib/organization-profile";
import ProvinceSelect from "@/components/ProvinceSelect";
import { provinceCode } from "@/lib/canadian-provinces";
import { displayLocation, ensureTagsArray } from "@/lib/utils";

export default function BusinessesPage() {
  return (
    <Suspense fallback={null}>
      <BusinessesPageContent />
    </Suspense>
  );
}

function BusinessesPageContent() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useDirectoryFilter("q", "");
  const [filter, setFilter] = useDirectoryFilter("type", "Indigenous");
  const [province, setProvince] = useDirectoryFilter("province", "");
  const [industry, setIndustry] = useDirectoryFilter("industry", "");
  const updateFilters = useDirectoryFilterActions();
  const clearFilters = () => updateFilters({ q: null, province: null, industry: null, type: "All Businesses" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/organizations");
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const data = await res.json();
        if (!cancelled) setOrgs(Array.isArray(data.orgs) ? data.orgs : []);
      } catch (err) {
        console.error("Failed to load businesses:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [attempt]);

  const businesses = useMemo(() => (
    orgs.filter((org) => org.ownerType !== "school" && org.type !== "school" && org.partnerTier !== "school")
  ), [orgs]);

  const industries = useMemo(() => [...new Set(businesses.map(org => org.industry?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)), [businesses]);

  const filtered = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return businesses
      .filter((org) => {
        if (filter === "Partners" && !org.isPartner) return false;
        if (filter === "Verified" && !org.verified) return false;
        if (filter === "Indigenous" && !hasOrganizationIndigenousIdentity(org)) return false;
        if (province && provinceCode(org.location?.province) !== (provinceCode(province) || province)) return false;
        if (industry && org.industry?.trim() !== industry) return false;
        if (!normalizedQuery) return true;

        return (
          org.name.toLowerCase().includes(normalizedQuery) ||
          org.shortName?.toLowerCase().includes(normalizedQuery) ||
          org.tagline?.toLowerCase().includes(normalizedQuery) ||
          org.description?.toLowerCase().includes(normalizedQuery) ||
          org.industry?.toLowerCase().includes(normalizedQuery) ||
          org.nation?.toLowerCase().includes(normalizedQuery) ||
          org.treatyTerritory?.toLowerCase().includes(normalizedQuery) ||
          displayLocation(org.location).toLowerCase().includes(normalizedQuery) ||
          ensureTagsArray(org.tags).some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          ensureTagsArray(org.services).some((service) => service.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((left, right) => {
        const leftWeight = Number(left.promotionWeight || 0);
        const rightWeight = Number(right.promotionWeight || 0);
        if (leftWeight !== rightWeight) return rightWeight - leftWeight;
        return left.name.localeCompare(right.name);
      });
  }, [businesses, filter, search, province, industry]);
  const { page, pageItems, totalPages, setPage } = useDirectoryPagination(filtered);

  const partnerCount = businesses.filter((org) => org.isPartner).length;
  const verifiedCount = businesses.filter((org) => org.verified).length;
  const indigenousCount = businesses.filter((org) => hasOrganizationIndigenousIdentity(org)).length;

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <section className="journey-directory-hero">
          <div className="op-wrap">
            <p className="op-eyebrow">Indigenous businesses & entrepreneurship</p>
            <h1>Make your next connection.</h1>
            <p>Discover Indigenous businesses, explore their work, and connect with the people building them.</p>
            <div className="journey-actions">
              <Link className="op-button" href="/signup?intent=indigenous-business">Add your business free</Link>
              <a href="#business-support">Funding & business support ↓</a>
              <Link href="/login?redirect=%2Forg%2Fdashboard">Manage your profile</Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-10">
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl"
            style={{ padding: "14px 20px", background: "var(--card)", border: "2px solid var(--border)" }}
          >
            <span aria-hidden="true" className="text-xl text-text-muted">&#128269;</span>
            <input
              type="search"
              aria-label="Search businesses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses by name, location, or industry..."
              className="min-w-0 flex-1 border-none bg-transparent text-base text-text outline-none"
            />
            {search && (
              <button
                aria-label="Clear business search"
                onClick={() => setSearch("")}
                className="cursor-pointer border-none bg-transparent text-lg text-text-muted"
              >
                &#10005;
              </button>
            )}
          </div>

          <div className="business-directory-filters">
            <label htmlFor="directory-province">Province or territory<ProvinceSelect id="directory-province" value={province} onChange={setProvince} placeholder="All provinces & territories" /></label>
            <label htmlFor="directory-industry">Industry<select id="directory-industry" value={industry} onChange={event => setIndustry(event.target.value)}><option value="">All industries</option>{industries.map(value => <option key={value} value={value}>{value}</option>)}{industry && !industries.includes(industry) && <option value={industry}>{industry}</option>}</select></label>
            <button type="button" onClick={clearFilters}>Clear all filters</button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(["All Businesses", "Partners", "Verified", "Indigenous"] as const).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className="rounded-full border-none px-4 py-2 text-[13px] font-semibold"
                style={{
                  background: filter === option ? "var(--navy)" : "var(--border)",
                  color: filter === option ? "#fff" : "var(--text-sec)",
                }}
              >
                {option === "All Businesses" ? "All businesses & organizations" : option === "Indigenous" ? "Indigenous-owned or led" : option}
                {option === "Partners" ? ` (${partnerCount})` : ""}
                {option === "Verified" ? ` (${verifiedCount})` : ""}
                {option === "Indigenous" ? ` (${indigenousCount})` : ""}
              </button>
            ))}
          </div>

          <p className="text-xs text-text-muted mb-4">Indigenous identity is provided in each organization’s profile. All businesses and organizations are welcome.</p>

          {!loading && !error && (
            <p className="mb-4 text-sm text-text-muted" aria-live="polite">
              {filtered.length} profile{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-[240px] rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              <p role="alert" className="mb-4">We couldn&apos;t load the businesses. Please try again.</p>
              <button type="button" className="rounded-xl bg-navy px-5 py-3 text-white" onClick={() => setAttempt(value => value + 1)}>Try again</button>
            </Card>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <p className="mb-3 text-4xl">&#127970;</p>
              <h3 className="mb-2 text-lg font-bold text-text">No businesses found</h3>
              <p className="mx-auto max-w-[420px] text-sm text-text-muted">
                {search || province || industry || filter !== "All Businesses"
                  ? "Try adjusting your search or filter."
                  : "Business profiles will appear here once added."}
              </p>
              <button type="button" className="employer-primary mt-5" onClick={clearFilters}>Browse all businesses</button>
            </Card>
          ) : (
            <div id="directory-results" tabIndex={-1} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((org) => (
                <BusinessCard key={org.id} org={org} />
              ))}
            </div>
          )}
          <DirectoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <section id="business-support" className="journey-support" aria-labelledby="support-heading">
            <p className="op-eyebrow">Funding & business support</p>
            <h2 id="support-heading">Support for what you’re building.</h2>
            <p>Explore official resources for Indigenous entrepreneurs, from local advice to financing your next step.</p>
            <div className="business-support-grid">
              <a href="https://nacca.ca/indigenous-financial-institutions/indigenous-financial-institutions-directory-map" target="_blank" rel="noopener noreferrer"><span>01 / LOCAL SUPPORT</span><h3>Find a financial institution near you.</h3><p>NACCA’s directory connects you with Indigenous Financial Institutions offering financing and business support.</p><strong>Explore the NACCA directory ↗</strong></a>
              <a href="https://nacca.ca/about-nacca/indigenous-entrepreneurship-program" target="_blank" rel="noopener noreferrer"><span>02 / FUNDING & GUIDANCE</span><h3>Build with the right support.</h3><p>Learn about NACCA entrepreneurship programs, including business financing, contributions, training and mentorship.</p><strong>Explore NACCA programs ↗</strong></a>
              <a href="https://www.bdc.ca/en/i-am/indigenous-entrepreneur" target="_blank" rel="noopener noreferrer"><span>03 / BUSINESS LOANS</span><h3>Finance your next chapter.</h3><p>Explore BDC’s financing options and resources for Indigenous entrepreneurs.</p><strong>Visit BDC ↗</strong></a>
            </div>
            <p className="business-resource-note">Independent resources, not IOPPS partner listings. Check eligibility and current availability with each provider. Links open in a new tab.</p>
            <Link className="journey-text-link" href="/contact">Does your organization support entrepreneurs? Get in touch →</Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function BusinessCard({ org }: { org: Organization }) {
  const location = displayLocation(org.location);
  const isPremium = org.partnerTier === "premium";
  const summary = org.tagline || org.description;
  const trustSignals = [
    org.verified ? "Verified" : "",
    hasOrganizationIndigenousIdentity(org) ? "Indigenous-owned or led" : "",
    org.nation || "",
  ].filter(Boolean);
  const surfaceTags = [...new Set([...ensureTagsArray(org.services), ...ensureTagsArray(org.tags)])].slice(0, 3);

  return (
    <Link href={`/org/${org.slug || org.id}`} className="no-underline">
      <Card
        className="journey-business-card h-full transition-shadow hover:shadow-lg"
        style={isPremium ? { borderColor: "rgba(251,191,36,.28)", boxShadow: "0 20px 34px -28px rgba(251,191,36,.45)" } : undefined}
      >
        <div style={{ padding: 20 }}>
          <div className="mb-3 flex items-center gap-3">
            {org.slug === "siga" || org.slug === "inspire-group-of-companies" || org.slug?.startsWith("city-of-saskatoon") ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl p-1.5" style={{ background: org.slug.startsWith("city-of-saskatoon") ? "var(--navy)" : "var(--teal-soft)" }}>
                <Image src={org.slug === "siga" ? "/redesign/siga.png" : org.slug === "inspire-group-of-companies" ? "/redesign/inspire-group.png" : org.logoUrl || org.logo || "/logo.png"} width={48} height={48} className="h-full w-full object-contain" alt="" />
              </div>
            ) : <Avatar
              name={org.shortName || org.name}
              size={48}
              src={org.logoUrl || org.logo}
              gradient={isPremium ? "linear-gradient(135deg, var(--gold), var(--navy))" : "linear-gradient(135deg, var(--navy), var(--teal))"}
            />}
            <div className="min-w-0 flex-1">
              {/* M-6: allow long org names to wrap to 2 lines instead of
                  chopping mid-word with a whitespace-nowrap ellipsis. */}
              <p
                className="m-0 line-clamp-2 text-[15px] font-bold text-text"
                style={{ overflowWrap: "anywhere" }}
                title={org.name}
              >
                {org.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {org.isPartner ? (
                  <Badge
                    text={org.partnerBadgeLabel || org.partnerLabel || "Partner"}
                    color={org.partnerTier === "premium" ? "var(--gold)" : "var(--teal)"}
                    bg={org.partnerTier === "premium" ? "var(--gold-soft)" : "var(--teal-soft)"}
                    small
                  />
                ) : (
                  <Badge text="Business" color="var(--blue)" bg="var(--blue-soft)" small />
                )}
                {org.industry ? (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-sec)" }}>
                    {org.industry}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {trustSignals.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {trustSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full text-[11px] font-semibold"
                  style={{ padding: "3px 10px", background: "rgba(13,148,136,.08)", border: "1px solid rgba(13,148,136,.12)", color: "var(--teal)" }}
                >
                  {signal}
                </span>
              ))}
            </div>
          )}

          {location && (
            <p className="m-0 mb-2.5 text-sm text-text-sec">
              &#128205; {location}
            </p>
          )}

          {summary && (
            <p
              className="m-0 mb-3 text-sm leading-relaxed text-text-sec"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary}
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold">
            {org.trainingCount ? (
              <span style={{ color: "var(--teal)" }}>{org.trainingCount} training</span>
            ) : null}
            {org.scholarshipCount ? (
              <span style={{ color: "var(--gold)" }}>{org.scholarshipCount} scholarships</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {surfaceTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full text-[11px] font-semibold text-teal"
                style={{ padding: "3px 10px", background: "rgba(13,148,136,.08)", border: "1px solid rgba(13,148,136,.12)" }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs font-bold">
            <span className="inline-flex items-center rounded-full px-3 py-1" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
              View profile &#8594;
            </span>
            {org.openJobs > 0 && (
              <span className="text-text-muted">
                {org.openJobs} open job{org.openJobs === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

