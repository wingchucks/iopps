"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import { listEmployers } from "@/lib/firestore";
import type { EmployerProfile, IndustryType } from "@/lib/types";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

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
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      // Query only approved employers directly from Firestore
      const data = await listEmployers("approved");
      let filtered = data;

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
    setIndustry(null);
  };

  const hasFilters = search || industry;

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-emerald-100">
            <BuildingOfficeIcon className="h-5 w-5" />
            Partner Organizations
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Organization Directory
          </h1>
          <p className="mt-4 text-lg text-emerald-100 sm:text-xl">
            Discover organizations committed to Indigenous employment and community development.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 text-white transition-colors hover:bg-white/20"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-600">
                  !
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          {/* Industries */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3">Industry</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIndustry(null)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  industry === null
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                All Industries
              </button>
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    industry === ind.value
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {loading
            ? "Loading..."
            : `${organizations.length} ${organizations.length === 1 ? "organization" : "organizations"} found`}
        </span>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <BuildingOfficeIcon className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No organizations found</h3>
          <p className="text-slate-400 mb-4">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Organizations will appear here once approved."}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${(org as any).slug || org.id}`}
              className="group relative block overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/30"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-teal-600/20" />
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
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
                        {org.organizationName?.charAt(0) || "O"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 pt-10">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {org.organizationName}
                  </h3>
                  {org.status === "approved" && (
                    <CheckBadgeIcon className="h-5 w-5 flex-shrink-0 text-emerald-400" />
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
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
        </div>
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
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
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
  );
}
