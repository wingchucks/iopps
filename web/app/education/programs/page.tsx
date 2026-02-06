"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeedLayout, SectionHeader } from "@/components/opportunity-graph";
import { EmptyState } from "@/components/EmptyState";
import type { UnifiedEducationListing, ProgramSource, ProgramLevel, ProgramDelivery } from "@/lib/types";
import {
  SearchBarRow,
  FiltersDrawer,
  ResultsHeader,
  DiscoveryGrid,
  LoadingGrid,
  FilterGroup,
  LoadMoreButton,
} from "@/components/discovery";
import { UnifiedProgramCard } from "@/components/education";

// Source options - which type of provider
const SOURCE_OPTIONS: { value: ProgramSource | ""; label: string }[] = [
  { value: "", label: "All Sources" },
  { value: "school", label: "Schools & Colleges" },
  { value: "provider", label: "Training Providers" },
];

// Unified categories that work across both program types
const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "Business & Management", label: "Business" },
  { value: "Technology & IT", label: "Technology" },
  { value: "Healthcare & Nursing", label: "Healthcare" },
  { value: "Trades & Industrial", label: "Trades" },
  { value: "Arts & Design", label: "Arts & Design" },
  { value: "Sciences", label: "Science" },
  { value: "Education & Teaching", label: "Education" },
  { value: "Law & Justice", label: "Law" },
  { value: "Social Work & Community", label: "Social Work" },
  { value: "Indigenous Studies", label: "Indigenous Studies" },
  { value: "Environment & Natural Resources", label: "Environmental" },
  { value: "Other", label: "Other" },
];

// Academic credential levels (only shown for school programs)
const LEVELS: { value: ProgramLevel | ""; label: string }[] = [
  { value: "", label: "All Credentials" },
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "microcredential", label: "Microcredential" },
  { value: "apprenticeship", label: "Apprenticeship" },
];

// Delivery format options
const FORMAT_OPTIONS: { value: ProgramDelivery | ""; label: string }[] = [
  { value: "", label: "All Formats" },
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

const PAGE_SIZE = 24;

function UnifiedProgramsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial source from URL params (for redirects from careers)
  const initialSource = (searchParams.get("source") as ProgramSource | null) || "";

  const [programs, setPrograms] = useState<UnifiedEducationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [source, setSource] = useState<ProgramSource | "">(initialSource);
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<ProgramLevel | "">("");
  const [format, setFormat] = useState<ProgramDelivery | "">("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [fundingAvailable, setFundingAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Navigate to provider page
  const handleProviderClick = useCallback(
    (e: React.MouseEvent, providerId: string) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if it's a school or organization
      const program = programs.find((p) => p.providerId === providerId);
      if (program?.providerType === "school") {
        router.push(`/education/schools/${providerId}`);
      } else {
        router.push(`/directory/${providerId}`);
      }
    },
    [router, programs]
  );

  // Load programs from unified API
  async function loadPrograms(isLoadMore = false) {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
    }

    try {
      const params = new URLSearchParams();
      if (source) params.set("source", source);
      if (category) params.set("category", category);
      if (level && source !== "provider") params.set("level", level);
      if (format) params.set("format", format);
      if (indigenousFocused) params.set("indigenousFocused", "true");
      if (fundingAvailable && source !== "school") params.set("fundingAvailable", "true");
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(isLoadMore ? offset + PAGE_SIZE : 0));

      const url = `/api/education/unified-programs${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (isLoadMore) {
        setPrograms((prev) => [...prev, ...(data.programs || [])]);
        setOffset((prev) => prev + PAGE_SIZE);
      } else {
        setPrograms(data.programs || []);
        setOffset(0);
      }

      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error("Failed to load programs:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Reload when filters change
  useEffect(() => {
    loadPrograms(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, category, level, format, indigenousFocused, fundingAvailable]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPrograms(false);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const hasFilters = Boolean(
    searchQuery || source || category || level || format || indigenousFocused || fundingAvailable
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSource("");
    setCategory("");
    setLevel("");
    setFormat("");
    setIndigenousFocused(false);
    setFundingAvailable(false);
  };

  // Build filter groups for FiltersDrawer
  const filterGroups: FilterGroup[] = [
    {
      id: "source",
      label: "Source",
      type: "chips",
      options: SOURCE_OPTIONS.map((s) => ({ label: s.label, value: s.value })),
      value: source,
      onChange: (v) => {
        setSource(v as ProgramSource | "");
        // Clear level if switching to training providers
        if (v === "provider") {
          setLevel("");
        }
        // Clear funding if switching to schools
        if (v === "school") {
          setFundingAvailable(false);
        }
      },
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
      value: category,
      onChange: (v) => setCategory(v as string),
    },
    // Only show credential filter when not filtering to training providers only
    ...(source !== "provider"
      ? [
          {
            id: "level",
            label: "Credential",
            type: "select" as const,
            options: LEVELS.map((l) => ({ label: l.label, value: l.value })),
            value: level,
            onChange: (v: string | string[] | boolean) => setLevel(v as ProgramLevel | ""),
          },
        ]
      : []),
    {
      id: "format",
      label: "Format",
      type: "select",
      options: FORMAT_OPTIONS.map((f) => ({ label: f.label, value: f.value })),
      value: format,
      onChange: (v) => setFormat(v as ProgramDelivery | ""),
    },
    {
      id: "indigenous",
      label: "Indigenous Focus",
      type: "checkbox",
      options: [{ label: "Indigenous-Focused Programs", value: "indigenous" }],
      value: indigenousFocused,
      onChange: (v) => setIndigenousFocused(v as boolean),
    },
    // Only show funding filter when not filtering to schools only
    ...(source !== "school"
      ? [
          {
            id: "funding",
            label: "Funding",
            type: "checkbox" as const,
            options: [{ label: "Funding Available", value: "funding" }],
            value: fundingAvailable,
            onChange: (v: string | string[] | boolean) => setFundingAvailable(v as boolean),
          },
        ]
      : []),
  ];

  // Determine dynamic title based on active source filter
  const getTitle = () => {
    if (source === "school") return "School Programs";
    if (source === "provider") return "Training Programs";
    return "All Programs";
  };

  return (
    <FeedLayout activeNav="education">
      {/* Header */}
      <SectionHeader
        title="Explore Programs"
        subtitle="Discover academic degrees, diplomas, certificates, and professional training."
        icon="📚"
      />

      <SearchBarRow
        placeholder="Search programs, schools, skills..."
        value={searchQuery}
        onChange={setSearchQuery}
        onFiltersClick={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasFilters}
      />
      {/* Filters */}
      <FiltersDrawer
        isOpen={showFilters}
        filters={filterGroups}
        onClearAll={clearFilters}
        hasActiveFilters={hasFilters}
        variant="inline"
      />

      {/* Results Header */}
      <ResultsHeader
        title={getTitle()}
        count={total}
        loading={loading}
        hasFilters={hasFilters}
      />

      {/* Programs Grid */}
      {loading ? (
        <LoadingGrid count={9} height="h-72" />
      ) : programs.length > 0 ? (
        <>
          <DiscoveryGrid>
            {programs.map((program) => (
              <UnifiedProgramCard
                key={program.id}
                program={program}
                onProviderClick={handleProviderClick}
              />
            ))}
          </DiscoveryGrid>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8">
              {loadingMore ? (
                <div className="flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#14B8A6]" />
                </div>
              ) : (
                <LoadMoreButton
                  onClick={() => loadPrograms(true)}
                  label="Load more programs"
                />
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="education"
          title="No Programs Found"
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Programs will appear here once they're added."
          }
          action={{ label: "Browse Schools Instead", href: "/education/schools" }}
        />
      )}

      {/* CTA Section */}
      <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Are you an educator or training provider?
        </h2>
        <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
          List your programs on IOPPS to reach Indigenous learners across Canada.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/organization/education/setup"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            List Academic Programs
          </Link>
          <Link
            href="/organization/training/new"
            className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6] px-6 py-3 font-semibold text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors"
          >
            Add Training Program
          </Link>
        </div>
      </section>
    </FeedLayout>
  );
}

// Wrap in Suspense for useSearchParams
export default function UnifiedProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-900">
          <div className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
              <nav className="text-sm text-slate-500">
                <span>Home → Education → Programs</span>
              </nav>
            </div>
          </div>
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#14B8A6]" />
          </div>
        </div>
      }
    >
      <UnifiedProgramsContent />
    </Suspense>
  );
}
