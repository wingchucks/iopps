"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { listEducationPrograms, getProgramCountsByCategory } from "@/lib/firestore";
import type { EducationProgram, ProgramCategory, ProgramLevel, ProgramDelivery } from "@/lib/types";

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

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
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

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Education
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-white sm:text-5xl">
          Explore Programs
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Find degrees, diplomas, certificates, and courses from Indigenous-serving institutions.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Search Programs
            </label>
            <input
              type="text"
              placeholder="Program name, school, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProgramCategory | "")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ProgramLevel | "")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Method */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Format
            </label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as ProgramDelivery | "")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {DELIVERY_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkbox filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={indigenousFocused}
              onChange={(e) => setIndigenousFocused(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
            />
            Indigenous-Focused Programs
          </label>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-400">
          {loading ? "Loading..." : `${filteredPrograms.length} programs found`}
        </p>
        {(searchQuery || category || level || deliveryMethod || indigenousFocused) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setCategory("");
              setLevel("");
              setDeliveryMethod("");
              setIndigenousFocused(false);
            }}
            className="text-sm text-[#14B8A6] hover:text-[#16cdb8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
          ))}
        </div>
      ) : filteredPrograms.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <Link
              key={program.id}
              href={`/education/programs/${program.slug || program.id}`}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
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
                    <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-1 text-xs font-semibold text-amber-400">
                      Indigenous-Focused
                    </span>
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

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500 capitalize">{program.category}</span>
                <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
                  View Program →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-white mb-2">No Programs Found</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery || category || level || deliveryMethod || indigenousFocused
              ? "Try adjusting your search or filters."
              : "Programs will appear here once they're added."}
          </p>
          <Link
            href="/education/schools"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse Schools Instead
          </Link>
        </div>
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
  );
}
