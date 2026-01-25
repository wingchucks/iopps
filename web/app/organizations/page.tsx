"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";
import { EmptyState } from "@/components/EmptyState";
import { listEmployers } from "@/lib/firestore";
import type { EmployerProfile, IndustryType } from "@/lib/types";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<IndustryType | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEmployers();
      // Filter to only approved organizations
      let filtered = data.filter((org) => org.status === "approved");

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (org) =>
            org.organizationName?.toLowerCase().includes(searchLower) ||
            org.description?.toLowerCase().includes(searchLower) ||
            org.location?.toLowerCase().includes(searchLower)
        );
      }

      // Apply industry filter
      if (industry) {
        filtered = filtered.filter((org) => org.industry === industry);
      }

      setOrganizations(filtered);
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoading(false);
    }
  }, [search, industry]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
  };

  const hasFilters = search || industry;

  // Filter groups for FiltersDrawer
  const industryOptions = [
    { label: "All Industries", value: "" },
    ...INDUSTRIES.map((ind) => ({ label: ind.label, value: ind.value })),
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
  ];

  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Partner Organizations"
        title="Organization Directory"
        subtitle="Discover organizations committed to Indigenous employment and community development."
        size="md"
      >
        <SearchBarRow
          placeholder="Search organizations..."
          value={search}
          onChange={setSearch}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={!!hasFilters}
          variant="hero"
        />
      </OceanWaveHero>

      <PageShell>
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
                href={`/employers/${org.id}`}
                className="group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#14B8A6]/10 hover:border-[#14B8A6]/30"
              >
                {/* Banner/Cover */}
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  {/* Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border-4 border-slate-900 bg-slate-800 shadow-xl">
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
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#14B8A6] transition-colors line-clamp-1">
                      {org.organizationName}
                    </h3>
                    {org.status === "approved" && (
                      <CheckBadgeIcon className="h-5 w-5 flex-shrink-0 text-[#14B8A6]" />
                    )}
                  </div>

                  {org.description && (
                    <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                      {org.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {org.industry && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#14B8A6]/10 px-2.5 py-0.5 text-xs font-medium text-[#14B8A6]">
                        <BuildingOfficeIcon className="h-3 w-3" />
                        {INDUSTRIES.find((i) => i.value === org.industry)?.label || org.industry}
                      </span>
                    )}
                    {org.companySize && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                        <UsersIcon className="h-3 w-3" />
                        {org.companySize}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
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
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Looking for Opportunities?
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-slate-700"
            >
              View Training Programs
            </Link>
          </div>
        </section>
      </PageShell>
    </div>
  );
}
