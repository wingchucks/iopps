"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  MapPinIcon,
  ClockIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { listTrainingPrograms, trackEnrollmentClick } from "@/lib/firestore";
import type { TrainingProgram, TrainingFormat } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";
import { EmptyState } from "@/components/EmptyState";
import {
  SearchBarRow,
  FiltersDrawer,
  ResultsHeader,
  DiscoveryGrid,
  LoadingGrid,
  LoadMoreButton,
  FilterGroup,
  FormatBadge,
  DiscoveryBadge,
} from "@/components/discovery";

const CATEGORIES = [
  "All",
  "Technology",
  "Trades",
  "Healthcare",
  "Business",
  "Arts & Culture",
  "Environment",
  "Education",
  "Social Services",
] as const;

const FORMATS: { value: TrainingFormat | "All"; label: string }[] = [
  { value: "All", label: "All Formats" },
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];

type Category = (typeof CATEGORIES)[number];

function TrainingProgramsContent() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const { user, role } = useAuth();

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [format, setFormat] = useState<TrainingFormat | "All">("All");
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [fundingOnly, setFundingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listTrainingPrograms({ activeOnly: true });
        setPrograms(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load training programs right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Filtered programs
  const filtered = useMemo(() => {
    return programs.filter((program) => {
      if (!program.active) return false;

      const matchesSearch = search
        ? `${program.title} ${program.providerName} ${program.description ?? ""} ${program.category ?? ""} ${(program.skills ?? []).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesCategory =
        category === "All" || program.category === category;
      const matchesFormat = format === "All" || program.format === format;
      const matchesIndigenous =
        !indigenousOnly || Boolean(program.indigenousFocused);
      const matchesFunding = !fundingOnly || Boolean(program.fundingAvailable);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesFormat &&
        matchesIndigenous &&
        matchesFunding
      );
    });
  }, [programs, search, category, format, indigenousOnly, fundingOnly]);

  // Sort: featured first, then by created date
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      // Then by createdAt (newest first)
      const aTime = a.createdAt
        ? typeof a.createdAt === "object" && "toDate" in a.createdAt
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt as string).getTime()
        : 0;
      const bTime = b.createdAt
        ? typeof b.createdAt === "object" && "toDate" in b.createdAt
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt as string).getTime()
        : 0;
      return bTime - aTime;
    });
  }, [filtered]);

  // Get featured programs
  const featuredPrograms = useMemo(() => {
    return sorted.filter((p) => p.featured).slice(0, 3);
  }, [sorted]);

  const displayedPrograms = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;
  const hasFilters = Boolean(
    search ||
    category !== "All" ||
    format !== "All" ||
    indigenousOnly ||
    fundingOnly
  );

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setFormat("All");
    setIndigenousOnly(false);
    setFundingOnly(false);
    setDisplayLimit(12);
  };

  const handleEnrollClick = async (program: TrainingProgram) => {
    if (user) {
      await trackEnrollmentClick(
        user.uid,
        program.id,
        program.title,
        program.organizationName || program.providerName
      );
    }
    // Open external URL
    window.open(program.enrollmentUrl, "_blank", "noopener,noreferrer");
  };

  // Build filter groups for FiltersDrawer
  const categoryOptions = CATEGORIES.map((cat) => ({
    label: cat,
    value: cat,
  }));

  const formatOptions = FORMATS.map((f) => ({
    label: f.label,
    value: f.value,
  }));

  const filterGroups: FilterGroup[] = [
    {
      id: "category",
      label: "Category",
      type: "chips",
      options: categoryOptions.slice(0, 5),
      value: category,
      onChange: (v) => setCategory(v as Category),
    },
    {
      id: "format",
      label: "Format",
      type: "chips",
      options: formatOptions,
      value: format,
      onChange: (v) => setFormat(v as TrainingFormat | "All"),
    },
    {
      id: "indigenous",
      label: "Focus",
      type: "toggle",
      options: [{ label: "Indigenous-Focused", value: "indigenous" }],
      value: indigenousOnly,
      onChange: (v) => setIndigenousOnly(v as boolean),
    },
    {
      id: "funding",
      label: "Funding",
      type: "toggle",
      options: [{ label: "Funding Available", value: "funding" }],
      value: fundingOnly,
      onChange: (v) => setFundingOnly(v as boolean),
    },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Professional Development"
        title="Training Programs"
        subtitle="Build your skills with training programs from Indigenous-focused organizations and educational partners across Turtle Island."
        size="md"
      >
        <SearchBarRow
          placeholder="Search programs..."
          value={search}
          onChange={setSearch}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasFilters}
          variant="hero"
        />
      </OceanWaveHero>

      <PageShell>
        {/* Filters Panel */}
        <FiltersDrawer
          isOpen={showFilters}
          filters={filterGroups}
          onClearAll={clearFilters}
          hasActiveFilters={hasFilters}
        />

        {/* Featured Programs Section */}
        {!hasFilters && featuredPrograms.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <StarIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Featured Programs</h2>
            </div>
            <DiscoveryGrid>
              {featuredPrograms.map((program) => (
                <TrainingCard
                  key={program.id}
                  program={program}
                  featured
                  onEnrollClick={() => handleEnrollClick(program)}
                />
              ))}
            </DiscoveryGrid>
          </section>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* All Programs */}
        <section>
          <ResultsHeader
            title="All Training Programs"
            count={sorted.length}
            loading={loading}
            hasFilters={hasFilters}
          />

          {loading ? (
            <LoadingGrid count={6} height="h-80" />
          ) : programs.length === 0 && !hasFilters ? (
            <EmptyState
              icon="training"
              title="No training programs available yet"
              description="Check back soon! Organizations are adding training programs regularly."
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon="search"
              title="No programs found"
              description="Try adjusting your filters or search terms."
              action={{ label: "Clear filters", href: "#" }}
            />
          ) : (
            <>
              <DiscoveryGrid>
                {displayedPrograms.map((program) => (
                  <TrainingCard
                    key={program.id}
                    program={program}
                    onEnrollClick={() => handleEnrollClick(program)}
                  />
                ))}
              </DiscoveryGrid>
              {hasMore && (
                <LoadMoreButton
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  label="Load more programs"
                />
              )}
            </>
          )}
        </section>

        {/* Back to Jobs Link */}
        <div className="mt-8">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#14B8A6] transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Jobs & Training
          </Link>
        </div>

        {/* CTA Section - Only visible to employers and admins */}
        {(role === 'employer' || role === 'admin') && (
          <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Offer Training Programs?
            </h2>
            <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
              List your training program on IOPPS. Reach Indigenous learners and
              professionals across North America.
            </p>
            <Link
              href="/organization/training/new"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
            >
              Post a Training Program
            </Link>
          </section>
        )}
      </PageShell>
    </div>
  );
}

// Training Card Component
function TrainingCard({
  program,
  featured = false,
  onEnrollClick,
}: {
  program: TrainingProgram;
  featured?: boolean;
  onEnrollClick: () => void;
}) {
  const getFormatIcon = (format: TrainingFormat) => {
    switch (format) {
      case "online":
        return <ComputerDesktopIcon className="h-4 w-4" />;
      case "in-person":
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case "hybrid":
        return (
          <div className="flex -space-x-1">
            <ComputerDesktopIcon className="h-3 w-3" />
            <BuildingOfficeIcon className="h-3 w-3" />
          </div>
        );
    }
  };

  const getFormatLabel = (format: TrainingFormat) => {
    switch (format) {
      case "online":
        return "Online";
      case "in-person":
        return "In-Person";
      case "hybrid":
        return "Hybrid";
    }
  };

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
        featured
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : "border-slate-700 bg-slate-800/50 hover:border-[#14B8A6]/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#14B8A6]/20 to-cyan-600/10 px-5 py-5">
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3">
            <DiscoveryBadge variant="featured" />
          </div>
        )}

        {/* Format & Indigenous Badge */}
        <div className="flex flex-wrap gap-2">
          <FormatBadge format={program.format} />
          {program.indigenousFocused && (
            <DiscoveryBadge variant="indigenous-focused" />
          )}
        </div>

        {/* Category */}
        {program.category && (
          <span className="mt-2 inline-block rounded-full bg-[#14B8A6]/20 px-2.5 py-1 text-xs font-medium text-[#14B8A6]">
            {program.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#14B8A6] mb-1">
          {program.providerName}
        </p>

        <Link href={`/careers/programs/${program.id}`}>
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-[#14B8A6] transition-colors cursor-pointer">
            {program.title}
          </h3>
        </Link>

        {program.shortDescription && (
          <p className="mt-2 text-sm text-slate-300 line-clamp-2 flex-1">
            {program.shortDescription}
          </p>
        )}

        {/* Details */}
        <div className="mt-4 space-y-2">
          {program.duration && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <ClockIcon className="h-4 w-4 flex-shrink-0" />
              <span>{program.duration}</span>
            </div>
          )}
          {program.location && program.format !== "online" && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{program.location}</span>
            </div>
          )}
          {program.cost && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />
              <span>{program.cost}</span>
              {program.fundingAvailable && (
                <span className="ml-1 text-xs text-emerald-300">
                  (Funding available)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Skills */}
        {program.skills && program.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {program.skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300"
              >
                {skill}
              </span>
            ))}
            {program.skills.length > 3 && (
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                +{program.skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
          {program.certificationOffered ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <AcademicCapIcon className="h-4 w-4" />
              <span className="line-clamp-1">{program.certificationOffered}</span>
            </div>
          ) : (
            <span />
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              onEnrollClick();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#14B8A6]/20 px-3 py-1.5 text-sm font-semibold text-[#14B8A6] hover:bg-[#14B8A6]/30 transition-colors"
          >
            Learn More
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrainingProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Professional Development"
            title="Training Programs"
            subtitle="Build your skills with training programs from Indigenous-focused organizations and educational partners across Turtle Island."
            size="md"
          />
          <PageShell>
            <LoadingGrid count={6} height="h-80" />
          </PageShell>
        </div>
      }
    >
      <TrainingProgramsContent />
    </Suspense>
  );
}
