"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { PageShell } from "@/components/PageShell";

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
  const hasFilters =
    search ||
    category !== "All" ||
    format !== "All" ||
    indigenousOnly ||
    fundingOnly;

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

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="training-grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#training-grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 mb-4">
            <AcademicCapIcon className="h-4 w-4" />
            Professional Development
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Training Programs
          </h1>
          <p className="mt-4 text-lg text-purple-100 sm:text-xl">
            Build your skills with training programs from Indigenous-focused
            organizations and educational partners across Turtle Island.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, skills, providers..."
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
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-purple-600">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{programs.length}</p>
              <p className="text-sm text-purple-200">Programs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">
                {programs.filter((p) => p.format === "online").length}
              </p>
              <p className="text-sm text-purple-200">Online</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">
                {programs.filter((p) => p.fundingAvailable).length}
              </p>
              <p className="text-sm text-purple-200">With Funding</p>
            </div>
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Category */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      category === cat
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Format
              </label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      format === f.value
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Indigenous Focus */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Focus
              </label>
              <button
                onClick={() => setIndigenousOnly(!indigenousOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  indigenousOnly
                    ? "bg-teal-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Indigenous-Focused
              </button>
            </div>

            {/* Funding Available */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Funding
              </label>
              <button
                onClick={() => setFundingOnly(!fundingOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  fundingOnly
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Funding Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Programs Section */}
      {!hasFilters && featuredPrograms.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <StarIcon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Featured Programs</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPrograms.map((program) => (
              <TrainingCard
                key={program.id}
                program={program}
                featured
                onEnrollClick={() => handleEnrollClick(program)}
              />
            ))}
          </div>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {hasFilters ? "Search Results" : "All Training Programs"}
          </h2>
          <span className="text-sm text-slate-400">
            {loading
              ? "Loading..."
              : `${sorted.length} ${sorted.length === 1 ? "program" : "programs"}`}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-slate-800/50 h-80"
              />
            ))}
          </div>
        ) : programs.length === 0 && !hasFilters ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <AcademicCapIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No training programs available yet
            </h3>
            <p className="text-slate-400">
              Check back soon! Organizations are adding training programs
              regularly.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No programs found
            </h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
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
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-purple-500 hover:text-purple-400"
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
      </section>

      {/* Back to Jobs Link */}
      <div className="mt-8">
        <Link
          href="/careers"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors"
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

      {/* CTA Section */}
      <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Offer Training Programs?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          List your training program on IOPPS. Reach Indigenous learners and
          professionals across North America.
        </p>
        <a
          href="/organization/training/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105"
        >
          Post a Training Program
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </a>
      </section>
    </PageShell>
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
          : "border-slate-700 bg-slate-800/50 hover:border-purple-500/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-purple-600/20 to-indigo-600/10 px-5 py-5">
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <StarIcon className="h-3 w-3" />
            Featured
          </div>
        )}

        {/* Format & Indigenous Badge */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            {getFormatIcon(program.format)}
            {getFormatLabel(program.format)}
          </span>
          {program.indigenousFocused && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-1 text-xs font-semibold text-teal-300">
              <CheckBadgeIcon className="h-3 w-3" />
              Indigenous-Focused
            </span>
          )}
        </div>

        {/* Category */}
        {program.category && (
          <span className="mt-2 inline-block rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-300">
            {program.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          {program.providerName}
        </p>

        <Link href={`/careers/programs/${program.id}`}>
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors cursor-pointer">
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
            className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-1.5 text-sm font-semibold text-purple-300 hover:bg-purple-500/30 transition-colors"
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
        <PageShell>
          <div className="mx-auto max-w-7xl">
            <div className="h-64 w-full animate-pulse rounded-3xl bg-slate-800/50 mb-12" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </div>
        </PageShell>
      }
    >
      <TrainingProgramsContent />
    </Suspense>
  );
}
