import { Suspense } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  MapPinIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { listSchools, getFeaturedSchools } from "@/lib/firestore";
import type { School, SchoolType } from "@/lib/types";
import { SCHOOL_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

async function FeaturedSchools() {
  const schools = await getFeaturedSchools(4);

  if (schools.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-white mb-6">Featured Schools</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {schools.map((school) => (
          <Link
            key={school.id}
            href={`/education/schools/${school.slug || school.id}`}
            className="group rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="h-12 w-12 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-amber-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                    {school.name}
                  </h3>
                  {school.isVerified && (
                    <CheckBadgeIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {school.location?.city}, {school.location?.province}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                Featured
              </span>
              <span className="text-xs text-slate-500">
                {school.programCount || 0} programs
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function SchoolsList({
  type,
  province,
  search,
}: {
  type?: SchoolType;
  province?: string;
  search?: string;
}) {
  const schools = await listSchools({
    type,
    province,
    isPublished: true,
    maxResults: 50,
  });

  // Client-side search filter
  let filteredSchools = schools;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredSchools = schools.filter(
      (s) =>
        s.name.toLowerCase().includes(searchLower) ||
        s.location?.city?.toLowerCase().includes(searchLower)
    );
  }

  if (filteredSchools.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-4 text-slate-400">
          No schools found matching your criteria.
        </p>
        <Link
          href="/education/schools"
          className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300"
        >
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {filteredSchools.map((school) => (
        <SchoolCard key={school.id} school={school} />
      ))}
    </div>
  );
}

function SchoolCard({ school }: { school: School }) {
  const typeLabel =
    SCHOOL_TYPES.find((t) => t.value === school.type)?.label || school.type;

  return (
    <Link
      href={`/education/schools/${school.slug || school.id}`}
      className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-violet-500/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={school.name}
            className="h-16 w-16 rounded-xl object-cover border border-slate-700"
          />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <AcademicCapIcon className="h-8 w-8 text-violet-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
              {school.name}
            </h3>
            {school.isVerified && (
              <CheckBadgeIcon className="h-5 w-5 text-violet-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-slate-400">{typeLabel}</p>
        </div>
      </div>

      {school.description && (
        <p className="mt-4 text-sm text-slate-300 line-clamp-2">
          {school.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
          <MapPinIcon className="h-3 w-3" />
          {school.location?.city}, {school.location?.province}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
          <BookOpenIcon className="h-3 w-3" />
          {school.programCount || 0} programs
        </span>
      </div>

      {school.indigenousFocused && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
            <CheckBadgeIcon className="h-3 w-3" />
            Indigenous-Focused Institution
          </span>
        </div>
      )}
    </Link>
  );
}

export default async function SchoolsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const type = params.type as SchoolType | undefined;
  const province = params.province;
  const search = params.search;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="relative border-b border-slate-800 bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BuildingLibraryIcon className="h-6 w-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Schools Directory</h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl">
            Discover post-secondary institutions across Canada that offer
            programs and support services for Indigenous students.
          </p>

          {/* Search */}
          <form className="mt-8 flex gap-4" action="/education/schools">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                name="search"
                placeholder="Search schools..."
                defaultValue={search}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Type:</label>
            <form action="/education/schools" className="inline">
              {province && (
                <input type="hidden" name="province" value={province} />
              )}
              {search && <input type="hidden" name="search" value={search} />}
              <select
                name="type"
                defaultValue={type || ""}
                onChange={(e) => e.target.form?.submit()}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="">All Types</option>
                {SCHOOL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Province:</label>
            <form action="/education/schools" className="inline">
              {type && <input type="hidden" name="type" value={type} />}
              {search && <input type="hidden" name="search" value={search} />}
              <select
                name="province"
                defaultValue={province || ""}
                onChange={(e) => e.target.form?.submit()}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="">All Provinces</option>
                <option value="AB">Alberta</option>
                <option value="BC">British Columbia</option>
                <option value="MB">Manitoba</option>
                <option value="NB">New Brunswick</option>
                <option value="NL">Newfoundland and Labrador</option>
                <option value="NS">Nova Scotia</option>
                <option value="NT">Northwest Territories</option>
                <option value="NU">Nunavut</option>
                <option value="ON">Ontario</option>
                <option value="PE">Prince Edward Island</option>
                <option value="QC">Quebec</option>
                <option value="SK">Saskatchewan</option>
                <option value="YT">Yukon</option>
              </select>
            </form>
          </div>

          {(type || province || search) && (
            <Link
              href="/education/schools"
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Clear filters
            </Link>
          )}
        </div>

        {/* Featured Schools */}
        {!type && !province && !search && (
          <Suspense
            fallback={
              <div className="mb-12 h-48 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
            }
          >
            <FeaturedSchools />
          </Suspense>
        )}

        {/* All Schools */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {type || province || search ? "Search Results" : "All Schools"}
          </h2>
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <SchoolsList type={type} province={province} search={search} />
          </Suspense>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Are You an Educational Institution?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            Join our directory to connect with Indigenous students across
            Canada. List your programs, scholarships, and recruitment events.
          </p>
          <Link
            href="/organization/education"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
          >
            Partner With Us
          </Link>
        </section>
      </div>
    </div>
  );
}
