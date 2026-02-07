"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedLayout, SectionHeader } from "@/components/opportunity-graph";
import { listSchools } from "@/lib/firestore";
import type { School, SchoolType } from "@/lib/types";

const SCHOOL_TYPES: { value: SchoolType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic" },
  { value: "tribal_college", label: "Tribal College" },
  { value: "training_provider", label: "Training Provider" },
];

const PROVINCES = [
  { value: "", label: "All Provinces" },
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland & Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType | "">("");
  const [province, setProvince] = useState("");
  const [indigenousControlled, setIndigenousControlled] = useState(false);

  useEffect(() => {
    loadSchools();
  }, [schoolType, province, indigenousControlled]);

  async function loadSchools() {
    setLoading(true);
    try {
      const schoolList = await listSchools({
        publishedOnly: true,
        type: schoolType || undefined,
        province: province || undefined,
        indigenousControlled: indigenousControlled || undefined,
      });
      setSchools(schoolList);
    } catch (error) {
      console.error("Failed to load schools:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSchools = schools.filter((school) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      school.name.toLowerCase().includes(query) ||
      school.headOffice?.city?.toLowerCase().includes(query) ||
      school.description?.toLowerCase().includes(query)
    );
  });

  const getSchoolTypeIcon = (type?: SchoolType) => {
    switch (type) {
      case "university": return "🎓";
      case "college": return "🏫";
      case "polytechnic": return "🔧";
      case "tribal_college": return "🪶";
      case "training_provider": return "📚";
      default: return "🏫";
    }
  };

  return (
    <FeedLayout activeNav="education">
      <SectionHeader
        title="Find Your School"
        subtitle="Discover Indigenous-serving institutions, tribal colleges, and universities committed to supporting Indigenous students."
        icon="🏫"
      />

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 mb-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              Search Schools
            </label>
            <input
              type="text"
              placeholder="School name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* School Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              School Type
            </label>
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value as SchoolType | "")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[#14B8A6] focus:outline-none"
            >
              {SCHOOL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              Province/Territory
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[#14B8A6] focus:outline-none"
            >
              {PROVINCES.map((prov) => (
                <option key={prov.value} value={prov.value}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkbox filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={indigenousControlled}
              onChange={(e) => setIndigenousControlled(e.target.checked)}
              className="rounded border-[var(--border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
            />
            Indigenous-Controlled Institutions
          </label>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-foreground0">
          {loading ? "Loading..." : `${filteredSchools.length} schools found`}
        </p>
        {(searchQuery || schoolType || province || indigenousControlled) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSchoolType("");
              setProvince("");
              setIndigenousControlled(false);
            }}
            className="text-sm text-[#14B8A6] hover:text-[#16cdb8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Schools Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-[var(--background)] h-64" />
          ))}
        </div>
      ) : filteredSchools.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSchools.map((school) => (
            <Link
              key={school.id}
              href={`/education/schools/${school.slug || school.id}`}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 border border-[#14B8A6]/40">
                  <span className="text-2xl">{getSchoolTypeIcon(school.type)}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {school.verification?.isVerified && (
                    <span className="rounded-md bg-accent/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6]">
                      Verified
                    </span>
                  )}
                  {school.verification?.indigenousControlled && (
                    <span className="rounded-md bg-[var(--amber-bg)] border border-amber-300 px-2 py-1 text-xs font-semibold text-[var(--amber)]">
                      Indigenous-Controlled
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                {school.name}
              </h3>

              <p className="text-sm text-foreground0 mb-3 line-clamp-2">
                {school.description || "Explore programs and opportunities at this institution."}
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-foreground0">
                <span>📍 {school.headOffice?.city}, {school.headOffice?.province}</span>
                {school.stats?.totalPrograms && (
                  <span>📚 {school.stats.totalPrograms} programs</span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] capitalize">{school.type?.replace("_", " ")}</span>
                <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
                  View School →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Schools Found</h3>
          <p className="text-foreground0 mb-6">
            {searchQuery || schoolType || province || indigenousControlled
              ? "Try adjusting your search or filters."
              : "Schools will appear here once they're added."}
          </p>
          <Link
            href="/education/programs"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors"
          >
            Browse Programs Instead
          </Link>
        </div>
      )}

      {/* CTA Section */}
      <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-[var(--border)] p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Are You a School Administrator?
        </h2>
        <p className="mt-3 text-foreground0 max-w-2xl mx-auto">
          List your institution on IOPPS and connect with Indigenous students seeking educational opportunities.
        </p>
        <Link
          href="/organization/dashboard?tab=education"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors"
        >
          List Your School
        </Link>
      </section>
    </FeedLayout>
  );
}
