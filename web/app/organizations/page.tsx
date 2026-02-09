"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import { SectionHeader } from "@/components/opportunity-graph";
import { EmptyState } from "@/components/EmptyState";
import { listEmployers } from "@/lib/firestore";
import type { EmployerProfile, IndustryType, CompanySize } from "@/lib/types";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  SearchBarRow,
  FiltersDrawer,
  ResultsHeader,
  DiscoveryGrid,
  LoadingGrid,
  FilterGroup,
} from "@/components/discovery";

const INDUSTRIES: { value: IndustryType; label: string }[] = [
  { value: "government", label: "Government" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "construction", label: "Construction" },
  { value: "natural-resources", label: "Natural Resources" },
  { value: "environmental", label: "Environmental" },
  { value: "technology", label: "Technology" },
  { value: "arts-culture", label: "Arts & Culture" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "retail", label: "Retail" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "500+", label: "500+" },
];

export default function OrganizationsPage() {
  const [allOrganizations, setAllOrganizations] = useState<(EmployerProfile & { slug?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<IndustryType | "">("");
  const [companySize, setCompanySize] = useState<CompanySize | "">("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [region, setRegion] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all orgs once, filter client-side
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listEmployers("approved", false, true);
        setAllOrganizations(data);
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Derive unique regions from org locations
  const regionOptions = useMemo(() => {
    const regions = new Set<string>();
    for (const org of allOrganizations) {
      if (org.location) {
        // Extract province/territory from "City, Province" pattern
        const parts = org.location.split(",").map((s) => s.trim());
        const last = parts[parts.length - 1];
        if (last) regions.add(last);
      }
    }
    return [
      { label: "All Regions", value: "" },
      ...[...regions].sort().map((r) => ({ label: r, value: r })),
    ];
  }, [allOrganizations]);

  // Client-side filtering
  const organizations = useMemo(() => {
    let filtered = allOrganizations;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.organizationName?.toLowerCase().includes(searchLower) ||
          org.description?.toLowerCase().includes(searchLower) ||
          org.location?.toLowerCase().includes(searchLower) ||
          org.indigenousVerification?.nationAffiliation?.toLowerCase().includes(searchLower)
      );
    }

    if (industry) {
      filtered = filtered.filter((org) => org.industry === industry);
    }

    if (companySize) {
      filtered = filtered.filter((org) => org.companySize === companySize);
    }

    if (region) {
      filtered = filtered.filter((org) => org.location?.includes(region));
    }

    if (verifiedOnly) {
      filtered = filtered.filter(
        (org) => org.indigenousVerification?.status === "approved"
      );
    }

    return filtered;
  }, [allOrganizations, search, industry, companySize, region, verifiedOnly]);

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setCompanySize("");
    setRegion("");
    setVerifiedOnly(false);
  };

  const hasFilters = search || industry || companySize || region || verifiedOnly;

  // Filter groups for FiltersDrawer
  const industryOptions = [
    { label: "All Industries", value: "" },
    ...INDUSTRIES.map((ind) => ({ label: ind.label, value: ind.value })),
  ];

  const sizeOptions = [
    { label: "All Sizes", value: "" },
    ...COMPANY_SIZES.map((s) => ({ label: s.label, value: s.value })),
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "industry",
      label: "Industry",
      type: "chips",
      options: industryOptions,
      value: industry,
      onChange: (v) => setIndustry(v as IndustryType | ""),
    },
    {
      id: "region",
      label: "Region",
      type: "select",
      options: regionOptions,
      value: region,
      onChange: (v) => setRegion(v as string),
    },
    {
      id: "companySize",
      label: "Company Size",
      type: "select",
      options: sizeOptions,
      value: companySize,
      onChange: (v) => setCompanySize(v as CompanySize | ""),
    },
    {
      id: "verified",
      label: "Indigenous Verified",
      type: "toggle",
      options: [{ label: "Verified Only", value: "true" }],
      value: verifiedOnly,
      onChange: (v) => setVerifiedOnly(v as boolean),
    },
  ];

  return (
    <FeedLayout activeNav="organizations">
      <SectionHeader title="Organization Directory" subtitle="Discover organizations committed to Indigenous employment and community development" icon="briefcase" />
        <SearchBarRow
          placeholder="Search organizations..."
          value={search}
          onChange={setSearch}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={!!hasFilters}
        />
        {/* Filters Panel */}
        <FiltersDrawer
          isOpen={showFilters}
          filters={filterGroups}
          onClearAll={clearFilters}
          hasActiveFilters={!!hasFilters}
        />

        {/* Results Header */}
        <ResultsHeader
          title="All Organizations"
          count={organizations.length}
          loading={loading}
          hasFilters={!!hasFilters}
        />

        {/* Organizations Grid */}
        {loading ? (
          <LoadingGrid count={9} height="h-64" />
        ) : organizations.length === 0 ? (
          <EmptyState
            icon="organizations"
            title="No organizations found"
            description={
              hasFilters
                ? "Try adjusting your filters or search terms."
                : "Organizations will appear here once approved."
            }
            action={hasFilters ? { label: "Clear filters", href: "#" } : undefined}
          />
        ) : (
          <DiscoveryGrid>
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={org.slug ? `/organizations/${org.slug}` : `/employers/${org.id}`}
                className="group relative block overflow-hidden rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#14B8A6]/10 hover:border-[#14B8A6]/30 focus-within:shadow-xl focus-within:shadow-[#14B8A6]/10 focus-within:border-[#14B8A6]/30 active:shadow-xl active:shadow-[#14B8A6]/10 active:border-[#14B8A6]/30"
              >
                {/* Banner/Cover */}
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {org.bannerUrl ? (
                    <Image
                      src={org.bannerUrl}
                      alt={org.organizationName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/20 to-cyan-600/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />

                  {/* Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border-4 border-white bg-[var(--card-bg)] shadow-xl">
                      {org.logoUrl ? (
                        <Image
                          src={org.logoUrl}
                          alt={`${org.organizationName} logo`}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#14B8A6] to-cyan-600 text-xl font-bold text-white">
                          {org.organizationName?.charAt(0) || "O"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 pt-10">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[#14B8A6] transition-colors line-clamp-1">
                      {org.organizationName}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {org.indigenousVerification?.status === "approved" && (
                        <span title="Indigenous Verified">
                          <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
                        </span>
                      )}
                      {org.status === "approved" && (
                        <CheckBadgeIcon className="h-5 w-5 text-[#14B8A6]" />
                      )}
                    </div>
                  </div>

                  {org.description && (
                    <p className="mt-2 text-sm text-foreground0 line-clamp-2">
                      {org.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {org.indigenousVerification?.status === "approved" && org.indigenousVerification.nationAffiliation && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                        <ShieldCheckIcon className="h-3 w-3" />
                        {org.indigenousVerification.nationAffiliation}
                      </span>
                    )}
                    {org.industry && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-[#14B8A6]">
                        <BuildingOfficeIcon className="h-3 w-3" />
                        {INDUSTRIES.find((i) => i.value === org.industry)?.label || org.industry}
                      </span>
                    )}
                    {org.companySize && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        <UsersIcon className="h-3 w-3" />
                        {org.companySize}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-foreground0">
                    {org.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {org.location}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </DiscoveryGrid>
        )}

        {/* CTA Section */}
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-100 to-slate-50 border border-[var(--border)] p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Looking for Opportunities?
          </h2>
          <p className="mt-3 text-foreground0 max-w-2xl mx-auto">
            Browse job openings and training programs from organizations committed to Indigenous employment.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#14B8A6] to-cyan-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-[#14B8A6]/25 transition-all hover:shadow-xl hover:shadow-[#14B8A6]/30 hover:scale-105"
            >
              <BriefcaseIcon className="h-5 w-5" />
              Browse Jobs
            </Link>
            <Link
              href="/careers/programs"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-8 py-3 text-lg font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--background)]"
            >
              View Training Programs
            </Link>
          </div>
        </section>
    </FeedLayout>
  );
}
