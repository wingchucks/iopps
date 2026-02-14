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
import type { School } from "@/lib/firestore/schools";

// ============================================
// CONSTANTS
// ============================================

const TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "University", value: "university" },
  { label: "College", value: "college" },
  { label: "Polytechnic", value: "polytechnic" },
  { label: "Indigenous Institution", value: "indigenous_institution" },
  { label: "Training Centre", value: "training_centre" },
] as const;

const PROVINCE_OPTIONS = [
  { label: "All Provinces", value: "" },
  { label: "Alberta", value: "AB" },
  { label: "British Columbia", value: "BC" },
  { label: "Manitoba", value: "MB" },
  { label: "New Brunswick", value: "NB" },
  { label: "Newfoundland and Labrador", value: "NL" },
  { label: "Northwest Territories", value: "NT" },
  { label: "Nova Scotia", value: "NS" },
  { label: "Nunavut", value: "NU" },
  { label: "Ontario", value: "ON" },
  { label: "Prince Edward Island", value: "PE" },
  { label: "Quebec", value: "QC" },
  { label: "Saskatchewan", value: "SK" },
  { label: "Yukon", value: "YT" },
] as const;

// ============================================
// TYPES
// ============================================

interface SchoolsApiResponse {
  schools: School[];
  total: number;
}

// ============================================
// COMPONENT
// ============================================

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [province, setProvince] = useState("");

  useEffect(() => {
    async function loadSchools() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (province) params.set("province", province);

        const res = await fetch(
          `/api/education/schools?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch schools");

        const data: SchoolsApiResponse = await res.json();
        setSchools(data.schools);
      } catch (err) {
        console.error("Failed to load schools:", err);
        setError("Unable to load schools right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void loadSchools();
  }, [type, province]);

  // Client-side text search
  const filtered = useMemo(() => {
    if (!search.trim()) return schools;
    const searchLower = search.toLowerCase();
    return schools.filter(
      (s) =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.headOffice?.city?.toLowerCase().includes(searchLower) ||
        s.nation?.toLowerCase().includes(searchLower),
    );
  }, [schools, search]);

  const hasActiveFilters = Boolean(search || type || province);

  const clearFilters = useCallback(() => {
    setSearch("");
    setType("");
    setProvince("");
  }, []);

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
            <span className="text-text-primary">Schools</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text-primary">
          School Directory
        </h1>
        <p className="mt-2 text-text-secondary">
          Discover educational institutions serving Indigenous communities across
          Canada. Find universities, colleges, and Indigenous-controlled
          institutions.
        </p>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                options={[...TYPE_OPTIONS]}
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="School Type"
              />
              <Select
                options={[...PROVINCE_OPTIONS]}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Province"
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "school" : "schools"} found
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
                  <Skeleton className="mb-3 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="mb-4 h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
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
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
                />
              </svg>
            }
            title={
              hasActiveFilters
                ? "No schools match your filters"
                : "No schools available"
            }
            description={
              hasActiveFilters
                ? "Try adjusting your search terms or filters."
                : "Check back soon! Schools are being added regularly."
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
                  All Schools
                </h2>
                <span className="text-sm text-text-muted">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "school" : "schools"}
                </span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA Section */}
      <section className="border-t border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Register Your Institution
          </h2>
          <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
            Become an IOPPS school partner and showcase your programs to
            Indigenous learners across Canada.
          </p>
          <div className="mt-6">
            <Button href="/contact" size="lg">
              Become a Partner
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// SCHOOL CARD
// ============================================

function SchoolCard({ school }: { school: School }) {
  const slug = school.slug || school.id;
  const location = [school.headOffice?.city, school.headOffice?.province]
    .filter(Boolean)
    .join(", ");

  return (
    <Link href={`/education/schools/${slug}`} className="group">
      <Card className="h-full transition-all duration-200 hover:border-card-border-hover hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
              {school.name}
            </h3>
            {school.verification?.isVerified && (
              <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                <svg
                  className="h-4 w-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
          </div>

          {location && (
            <div className="mb-2 flex items-center gap-1.5 text-sm text-text-secondary">
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
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <span>{location}</span>
            </div>
          )}

          {school.description && (
            <p className="mb-3 text-sm text-text-muted line-clamp-2">
              {school.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {school.type && (
              <Badge variant="info" className="capitalize">
                {school.type.replace(/_/g, " ")}
              </Badge>
            )}
            {school.verification?.indigenousControlled && (
              <Badge variant="success">Indigenous Controlled</Badge>
            )}
            {school.featured && (
              <Badge variant="warning">Featured</Badge>
            )}
            {school.nation && (
              <Badge variant="default">{school.nation}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
