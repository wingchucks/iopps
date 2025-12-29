"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { listEducationPrograms } from "@/lib/firestore";
import type {
  EducationProgram,
  ProgramLevel,
  ProgramDeliveryMethod,
  ProgramCategory,
} from "@/lib/types";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "@/lib/types";
import { PageShell } from "@/components/PageShell";

const DELIVERY_METHODS: { value: ProgramDeliveryMethod | "All"; label: string }[] = [
  { value: "All", label: "All Formats" },
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];

function ProgramsContent() {
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProgramCategory | "All">("All");
  const [level, setLevel] = useState<ProgramLevel | "All">("All");
  const [deliveryMethod, setDeliveryMethod] = useState<ProgramDeliveryMethod | "All">("All");
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEducationPrograms({ publishedOnly: true });
        setPrograms(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load programs right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Filtered programs
  const filtered = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch = search
        ? `${program.name} ${program.schoolName || ""} ${program.description ?? ""} ${program.category ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesCategory =
        category === "All" || program.category === category;
      const matchesLevel = level === "All" || program.level === level;
      const matchesDelivery =
        deliveryMethod === "All" || program.deliveryMethod === deliveryMethod;
      const matchesIndigenous =
        !indigenousOnly || Boolean(program.indigenousFocused);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLevel &&
        matchesDelivery &&
        matchesIndigenous
      );
    });
  }, [programs, search, category, level, deliveryMethod, indigenousOnly]);

  // Sort: featured first, then by name
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

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
    level !== "All" ||
    deliveryMethod !== "All" ||
    indigenousOnly;

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setLevel("All");
    setDeliveryMethod("All");
    setIndigenousOnly(false);
    setDisplayLimit(12);
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="prog-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#prog-grid)" />
          </svg>
        </div>

        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 mb-4">
            <AcademicCapIcon className="h-4 w-4" />
            Academic Programs
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Education Programs
          </h1>
          <p className="mt-4 text-lg text-purple-100 sm:text-xl">
            Discover certificate, diploma, and degree programs from Indigenous-focused
            institutions across Turtle Island.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, schools..."
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
                {programs.filter((p) => p.deliveryMethod === "online").length}
              </p>
              <p className="text-sm text-purple-200">Online</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">
                {programs.filter((p) => p.indigenousFocused).length}
              </p>
              <p className="text-sm text-purple-200">Indigenous-Focused</p>
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProgramCategory | "All")}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white text-sm"
              >
                <option value="All">All Categories</option>
                {PROGRAM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Level
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLevel("All")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    level === "All"
                      ? "bg-purple-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  All
                </button>
                {PROGRAM_LEVELS.slice(0, 3).map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setLevel(lvl.value as ProgramLevel | "All")}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      level === lvl.value
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Format
              </label>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_METHODS.map((dm) => (
                  <button
                    key={dm.value}
                    onClick={() => setDeliveryMethod(dm.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      deliveryMethod === dm.value
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {dm.label}
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
          </div>
        </div>
      )}

      {/* Featured Programs */}
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
              <ProgramCard key={program.id} program={program} featured />
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
            {hasFilters ? "Search Results" : "All Programs"}
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
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-80" />
            ))}
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
              {hasFilters
                ? "Try adjusting your filters or search terms."
                : "Check back soon! Schools are adding programs regularly."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
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

      {/* Back Link */}
      <div className="mt-8">
        <Link
          href="/education"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Education
        </Link>
      </div>
    </PageShell>
  );
}

// Program Card Component
function ProgramCard({
  program,
  featured = false,
}: {
  program: EducationProgram;
  featured?: boolean;
}) {
  const getDeliveryIcon = (method: ProgramDeliveryMethod) => {
    switch (method) {
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

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      certificate: "Certificate",
      diploma: "Diploma",
      bachelor: "Bachelor's",
      master: "Master's",
      doctorate: "Doctorate",
      microcredential: "Microcredential",
    };
    return labels[level] || level;
  };

  return (
    <Link
      href={`/education/programs/${program.slug || program.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
        featured
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : "border-slate-700 bg-slate-800/50 hover:border-purple-500/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-purple-600/20 to-indigo-600/10 px-5 py-5">
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <StarIcon className="h-3 w-3" />
            Featured
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            {getDeliveryIcon(program.deliveryMethod)}
            <span className="capitalize">{program.deliveryMethod}</span>
          </span>
          {program.indigenousFocused && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-1 text-xs font-semibold text-teal-300">
              <CheckBadgeIcon className="h-3 w-3" />
              Indigenous-Focused
            </span>
          )}
        </div>

        <span className="mt-2 inline-block rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-300">
          {getLevelLabel(program.level)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          {program.schoolName}
        </p>

        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
          {program.name}
        </h3>

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
              <span>
                {program.duration.value} {program.duration.unit}
              </span>
            </div>
          )}
          {program.campuses && program.campuses.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{program.campuses.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Category Tag */}
        {program.category && (
          <div className="mt-3">
            <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
              {program.category}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="mx-auto max-w-7xl">
            <div className="h-64 w-full animate-pulse rounded-3xl bg-slate-800/50 mb-12" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-800/50" />
              ))}
            </div>
          </div>
        </PageShell>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
