"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
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

export function TrainingTabContent() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const { user } = useAuth();

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

      const matchesCategory = category === "All" || program.category === category;
      const matchesFormat = format === "All" || program.format === format;
      const matchesIndigenous = !indigenousOnly || Boolean(program.indigenousFocused);
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
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
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

  const displayedPrograms = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;
  const hasFilters = search || category !== "All" || format !== "All" || indigenousOnly || fundingOnly;

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
    window.open(program.enrollmentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search programs, skills, providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface py-3 pl-12 pr-4 text-sm text-white placeholder:text-foreground0 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-6 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-surface"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
            {hasFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-[var(--text-primary)]">
                !
              </span>
            )}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex gap-6 text-sm">
          <span className="text-[var(--text-muted)]">
            <span className="font-semibold text-white">{programs.length}</span> Programs
          </span>
          <span className="text-[var(--text-muted)]">
            <span className="font-semibold text-white">
              {programs.filter((p) => p.format === "online").length}
            </span> Online
          </span>
          <span className="text-[var(--text-muted)]">
            <span className="font-semibold text-white">
              {programs.filter((p) => p.fundingAvailable).length}
            </span> With Funding
          </span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-2xl bg-surface border border-[var(--card-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Category */}
            <div>
              <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      category === cat
                        ? "bg-accent text-[var(--text-primary)]"
                        : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                Format
              </label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      format === f.value
                        ? "bg-accent text-[var(--text-primary)]"
                        : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Indigenous Focus */}
            <div>
              <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                Focus
              </label>
              <button
                onClick={() => setIndigenousOnly(!indigenousOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  indigenousOnly
                    ? "bg-accent text-[var(--text-primary)]"
                    : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                }`}
              >
                Indigenous-Focused
              </button>
            </div>

            {/* Funding Available */}
            <div>
              <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                Funding
              </label>
              <button
                onClick={() => setFundingOnly(!fundingOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  fundingOnly
                    ? "bg-accent text-white"
                    : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                }`}
              >
                Funding Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {hasFilters ? "Search Results" : "All Training Programs"}
        </h2>
        <span className="text-sm text-[var(--text-muted)]">
          {loading ? "Loading..." : `${sorted.length} ${sorted.length === 1 ? "program" : "programs"}`}
        </span>
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-surface h-80" />
          ))}
        </div>
      ) : programs.length === 0 && !hasFilters ? (
        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-foreground0" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No training programs available yet
          </h3>
          <p className="text-[var(--text-muted)]">
            Check back soon! Organizations are adding training programs regularly.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="h-8 w-8 text-foreground0" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No programs found</h3>
          <p className="text-[var(--text-muted)] mb-4">Try adjusting your filters or search terms.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPrograms.map((program) => (
              <TrainingCard
                key={program.id}
                program={program}
                onEnrollClick={() => handleEnrollClick(program)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 12)}
                className="group inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-surface px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
              >
                Load more programs
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* CTA Section */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-[var(--card-border)] p-8 text-center">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Offer Training Programs?
        </h2>
        <p className="mt-2 text-[var(--text-muted)] max-w-xl mx-auto text-sm">
          List your training program on IOPPS and reach Indigenous learners across North America.
        </p>
        <Link
          href="/organization/training/new"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors text-sm"
        >
          Post a Training Program
        </Link>
      </section>
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
        featured || program.featured
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : "border-[var(--card-border)] bg-surface hover:border-[#14B8A6]/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#14B8A6]/20 to-cyan-600/10 px-5 py-5">
        {/* Featured Badge */}
        {(featured || program.featured) && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <StarIcon className="h-3 w-3" />
            Featured
          </div>
        )}

        {/* Format & Indigenous Badge */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {getFormatIcon(program.format)}
            {getFormatLabel(program.format)}
          </span>
          {program.indigenousFocused && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-[#14B8A6]">
              <CheckBadgeIcon className="h-3 w-3" />
              Indigenous-Focused
            </span>
          )}
        </div>

        {/* Category */}
        {program.category && (
          <span className="mt-2 inline-block rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-[#14B8A6]">
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
          <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2 flex-1">
            {program.shortDescription}
          </p>
        )}

        {/* Details */}
        <div className="mt-4 space-y-2">
          {program.duration && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <ClockIcon className="h-4 w-4 flex-shrink-0" />
              <span>{program.duration}</span>
            </div>
          )}
          {program.location && program.format !== "online" && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{program.location}</span>
            </div>
          )}
          {program.cost && (
            <div className="flex items-center gap-1.5 text-sm text-accent">
              <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />
              <span>{program.cost}</span>
              {program.fundingAvailable && (
                <span className="ml-1 text-xs text-emerald-300">(Funding available)</span>
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
                className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-[var(--text-secondary)]"
              >
                {skill}
              </span>
            ))}
            {program.skills.length > 3 && (
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-[var(--text-muted)]">
                +{program.skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--card-border)] pt-4">
          {program.certificationOffered ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
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
            className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold text-[#14B8A6] hover:bg-accent/30 transition-colors"
          >
            Learn More
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
