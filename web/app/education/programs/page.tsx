"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";
import { EmptyState } from "@/components/EmptyState";
import { listEducationPrograms } from "@/lib/firestore";
import type { EducationProgram, ProgramCategory, ProgramLevel, ProgramDelivery } from "@/lib/types";
import {
  SearchBarRow,
  FiltersDrawer,
  ResultsHeader,
  DiscoveryGrid,
  LoadingGrid,
  FilterGroup,
  DiscoveryBadge,
} from "@/components/discovery";

const CATEGORIES: { value: ProgramCategory | ""; label: string }[] = [
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

const LEVELS: { value: ProgramLevel | ""; label: string }[] = [
  { value: "", label: "All Levels" },
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "microcredential", label: "Microcredential" },
  { value: "apprenticeship", label: "Apprenticeship" },
];

const DELIVERY_METHODS: { value: ProgramDelivery | ""; label: string }[] = [
  { value: "", label: "All Formats" },
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export default function EducationProgramsPage() {
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<ProgramCategory | "">("");
  const [level, setLevel] = useState<ProgramLevel | "">("");
  const [deliveryMethod, setDeliveryMethod] = useState<ProgramDelivery | "">("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // Default to open for inline variant

  useEffect(() => {
    loadPrograms();
  }, [category, level, deliveryMethod, indigenousFocused]);

  async function loadPrograms() {
    setLoading(true);
    try {
      const programList = await listEducationPrograms({
        publishedOnly: true,
        category: category || undefined,
        level: level || undefined,
        deliveryMethod: deliveryMethod || undefined,
        indigenousFocused: indigenousFocused || undefined,
      });
      setPrograms(programList);
    } catch (error) {
      console.error("Failed to load programs:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPrograms = programs.filter((program) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      program.name.toLowerCase().includes(query) ||
      program.schoolName?.toLowerCase().includes(query) ||
      program.description?.toLowerCase().includes(query)
    );
  });

  const hasFilters = Boolean(searchQuery || category || level || deliveryMethod || indigenousFocused);

  const clearFilters = () => {
    setSearchQuery("");
    setCategory("");
    setLevel("");
    setDeliveryMethod("");
    setIndigenousFocused(false);
  };

  const getCategoryIcon = (cat?: ProgramCategory) => {
    switch (cat) {
      case "Business & Management": return "💼";
      case "Technology & IT": return "💻";
      case "Healthcare & Nursing": return "🏥";
      case "Trades & Industrial": return "🔧";
      case "Arts & Design": return "🎨";
      case "Sciences": return "🔬";
      case "Education & Teaching": return "📖";
      case "Law & Justice": return "⚖️";
      case "Social Work & Community": return "🤝";
      case "Indigenous Studies": return "🪶";
      case "Environment & Natural Resources": return "🌿";
      case "Engineering": return "⚙️";
      case "Agriculture": return "🌾";
      case "Hospitality & Tourism": return "🏨";
      default: return "📚";
    }
  };

  // Build filter groups for FiltersDrawer
  const filterGroups: FilterGroup[] = [
    {
      id: "category",
      label: "Category",
      type: "select",
      options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
      value: category,
      onChange: (v) => setCategory(v as ProgramCategory | ""),
    },
    {
      id: "level",
      label: "Level",
      type: "select",
      options: LEVELS.map((l) => ({ label: l.label, value: l.value })),
      value: level,
      onChange: (v) => setLevel(v as ProgramLevel | ""),
    },
    {
      id: "delivery",
      label: "Format",
      type: "select",
      options: DELIVERY_METHODS.map((d) => ({ label: d.label, value: d.value })),
      value: deliveryMethod,
      onChange: (v) => setDeliveryMethod(v as ProgramDelivery | ""),
    },
    {
      id: "indigenous",
      label: "Focus",
      type: "checkbox",
      options: [{ label: "Indigenous-Focused Programs", value: "indigenous" }],
      value: indigenousFocused,
      onChange: (v) => setIndigenousFocused(v as boolean),
    },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      {/* Breadcrumb - Above Hero */}
      <div className="bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <nav className="text-sm text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="mx-2">→</span>
            <Link href="/education" className="hover:text-white transition-colors">
              Education
            </Link>
            <span className="mx-2">→</span>
            <span className="text-white">Programs</span>
          </nav>
        </div>
      </div>

      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Education"
        title="Explore Programs"
        subtitle="Find degrees, diplomas, certificates, and courses from Indigenous-serving institutions."
        size="md"
      >
        <SearchBarRow
          placeholder="Search programs..."
          value={searchQuery}
          onChange={setSearchQuery}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasFilters}
          variant="hero"
        />
      </OceanWaveHero>

      <PageShell>
        {/* Filters - Inline Variant (always visible by default) */}
        <FiltersDrawer
          isOpen={showFilters}
          filters={filterGroups}
          onClearAll={clearFilters}
          hasActiveFilters={hasFilters}
          variant="inline"
        />

        {/* Results Header */}
        <ResultsHeader
          title="All Programs"
          count={filteredPrograms.length}
          loading={loading}
          hasFilters={hasFilters}
        />

        {/* Programs Grid */}
        {loading ? (
          <LoadingGrid count={9} height="h-64" />
        ) : filteredPrograms.length > 0 ? (
          <DiscoveryGrid>
            {filteredPrograms.map((program) => (
              <Link
                key={program.id}
                href={`/education/programs/${program.slug || program.id}`}
                className="group rounded-2xl border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                    <span className="text-xl">{getCategoryIcon(program.category)}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 capitalize">
                      {program.level}
                    </span>
                    {program.indigenousFocused && (
                      <DiscoveryBadge variant="indigenous-focused" size="sm" />
                    )}
                  </div>
                </div>

                <p className="text-xs font-semibold text-[#14B8A6] uppercase mb-1">
                  {program.schoolName}
                </p>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                  {program.name}
                </h3>

                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                  {program.description || "Explore this program and its opportunities."}
                </p>

                <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                  {program.duration && <span>⏱ {program.duration.value} {program.duration.unit}</span>}
                  <span className="capitalize">📍 {program.deliveryMethod}</span>
                </div>

                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <span className="text-xs text-slate-500 capitalize">{program.category}</span>
                  <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Program →
                  </span>
                </div>
              </Link>
            ))}
          </DiscoveryGrid>
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
        <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Looking for Training Programs?
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Check out our Careers section for professional training, trades programs, and skill-building courses.
          </p>
          <Link
            href="/careers/programs"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse Training Programs
          </Link>
        </section>
      </PageShell>
    </div>
  );
}
