"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import type { EducationProgram } from "@/lib/firestore/educationPrograms";

// ============================================
// CONSTANTS
// ============================================

const LEVEL_OPTIONS = [
  { label: "All Levels", value: "" },
  { label: "Certificate", value: "Certificate" },
  { label: "Diploma", value: "Diploma" },
  { label: "Associate Degree", value: "Associate Degree" },
  { label: "Bachelor's Degree", value: "Bachelor's Degree" },
  { label: "Master's Degree", value: "Master's Degree" },
  { label: "Doctoral Degree", value: "Doctoral Degree" },
  { label: "Professional Development", value: "Professional Development" },
  { label: "Continuing Education", value: "Continuing Education" },
] as const;

const DELIVERY_OPTIONS = [
  { label: "All Formats", value: "" },
  { label: "In-Person", value: "in-person" },
  { label: "Online", value: "online" },
  { label: "Hybrid", value: "hybrid" },
] as const;

const PAGE_SIZE = 12;

// ============================================
// TYPES
// ============================================

interface ProgramsApiResponse {
  programs: EducationProgram[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================
// COMPONENT
// ============================================

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // Filter state
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [delivery, setDelivery] = useState("");

  useEffect(() => {
    async function loadPrograms() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (level) params.set("level", level);
        if (delivery) params.set("deliveryMethod", delivery);
        params.set("limit", "200");
        params.set("page", "1");

        const res = await fetch(
          `/api/education/programs?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch programs");

        const data: ProgramsApiResponse = await res.json();
        setPrograms(data.programs);
      } catch (err) {
        console.error("Failed to load programs:", err);
        setError("Unable to load programs right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void loadPrograms();
  }, [level, delivery]);

  // Client-side text search
  const filtered = useMemo(() => {
    if (!search.trim()) return programs;
    const searchLower = search.toLowerCase();
    return programs.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower),
    );
  }, [programs, search]);

  const displayed = useMemo(
    () => filtered.slice(0, displayLimit),
    [filtered, displayLimit],
  );

  const hasMore = displayLimit < filtered.length;

  const hasActiveFilters = Boolean(search || level || delivery);

  const clearFilters = useCallback(() => {
    setSearch("");
    setLevel("");
    setDelivery("");
    setDisplayLimit(PAGE_SIZE);
  }, []);

  // Extract unique categories for display
  const categories = useMemo(() => {
    const cats = new Set<string>();
    programs.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [programs]);

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-card-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-text-muted">
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/education"
              className="hover:text-text-primary transition-colors"
            >
              Education
            </Link>
            <span>/</span>
            <span className="text-text-primary">Programs</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text-primary">
          Education Programs
        </h1>
        <p className="mt-2 text-text-secondary">
          Explore education programs from institutions across Canada. Find
          certificates, diplomas, and degrees designed for Indigenous learners.
        </p>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <Input
                  placeholder="Search programs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                options={[...LEVEL_OPTIONS]}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Program Level"
              />
              <Select
                options={[...DELIVERY_OPTIONS]}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                placeholder="Delivery Method"
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "result" : "results"} found
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {error && (
          <Card className="mb-6 border-error/30 bg-error/5">
            <CardContent className="p-4 text-sm text-error">
              {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-3 h-5 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="mb-4 h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
                />
              </svg>
            }
            title={
              hasActiveFilters
                ? "No programs match your filters"
                : "No programs available"
            }
            description={
              hasActiveFilters
                ? "Try adjusting your search terms or filters."
                : "Check back soon! Schools are adding programs regularly."
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {!hasActiveFilters && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">
                  All Programs
                </h2>
                <span className="text-sm text-text-muted">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "program" : "programs"}
                </span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setDisplayLimit((prev) => prev + PAGE_SIZE)
                  }
                >
                  Load more programs
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Section */}
      <section className="border-t border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Are You an Educational Institution?
          </h2>
          <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
            List your programs on IOPPS and connect with Indigenous learners
            across Canada.
          </p>
          <div className="mt-6">
            <Button href="/contact" size="lg">
              Partner With Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// PROGRAM CARD
// ============================================

function ProgramCard({ program }: { program: EducationProgram }) {
  return (
    <Card className="flex h-full flex-col transition-all duration-200 hover:border-card-border-hover hover:-translate-y-1">
      <CardContent className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-text-primary line-clamp-2">
          {program.name}
        </h3>

        {program.category && (
          <p className="mt-1 text-sm text-accent">{program.category}</p>
        )}

        {program.description && (
          <p className="mt-3 text-sm text-text-secondary line-clamp-3 flex-1">
            {program.description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-4 space-y-2">
          {program.duration && (
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{program.duration}</span>
            </div>
          )}
          {program.deliveryMethod && (
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                />
              </svg>
              <span className="capitalize">{program.deliveryMethod}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {program.level && (
            <Badge variant="info">{program.level}</Badge>
          )}
          {program.indigenousFocused && (
            <Badge variant="success">Indigenous Focused</Badge>
          )}
          {program.featured && (
            <Badge variant="warning">Featured</Badge>
          )}
        </div>

        {/* CTA */}
        {program.website && (
          <div className="mt-4 border-t border-card-border pt-4">
            <Button
              href={program.website}
              external
              variant="outline"
              size="sm"
              fullWidth
            >
              Learn More
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
