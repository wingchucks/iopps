"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import {
  getTrainingPrograms,
  type TrainingProgram,
} from "@/lib/firestore/training";

const categories = [
  "All",
  "Technology",
  "Business",
  "Trades",
  "Health",
  "Culture",
] as const;

const formats = ["All", "Online", "In-Person", "Hybrid"] as const;

const categoryColors: Record<string, { color: string; bg: string }> = {
  Technology: { color: "var(--blue)", bg: "var(--blue-soft)" },
  Business: { color: "var(--gold)", bg: "var(--gold-soft)" },
  Trades: { color: "var(--green)", bg: "var(--green-soft)" },
  Health: { color: "var(--red)", bg: "var(--red-soft)" },
  Culture: { color: "var(--purple)", bg: "var(--purple-soft)" },
};

function getCategoryStyle(category: string) {
  return (
    categoryColors[category] || {
      color: "var(--teal)",
      bg: "var(--teal-soft)",
    }
  );
}

function formatBadgeColor(format: string) {
  switch (format) {
    case "online":
      return { color: "var(--blue)", bg: "var(--blue-soft)" };
    case "in-person":
      return { color: "var(--green)", bg: "var(--green-soft)" };
    case "hybrid":
      return { color: "var(--purple)", bg: "var(--purple-soft)" };
    default:
      return { color: "var(--text-muted)", bg: "var(--border)" };
  }
}

export default function TrainingPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");

  useEffect(() => {
    getTrainingPrograms()
      .then(setPrograms)
      .catch((err) => console.error("Failed to load training programs:", err))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(
    () => programs.filter((p) => p.featured && p.active),
    [programs]
  );

  const filtered = useMemo(() => {
    let items = programs.filter((p) => p.active);
    if (selectedCategory !== "All") {
      items = items.filter((p) => p.category === selectedCategory);
    }
    if (selectedFormat !== "All") {
      items = items.filter(
        (p) => p.format === selectedFormat.toLowerCase().replace("-", "-")
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.instructor.name.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return items;
  }, [programs, selectedCategory, selectedFormat, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <NavBar />
        <div className="skeleton h-52 mb-6" />
        <div className="max-w-[1200px] mx-auto px-4 md:px-10">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-10 w-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <section
        className="text-center"
        style={{
          background:
            "linear-gradient(160deg, var(--teal) 0%, #0F766E 40%, #115E59 70%, var(--teal-light) 100%)",
          padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          Training Hub
        </h1>
        <p className="text-base text-white/70 mb-6 max-w-[500px] mx-auto">
          Build skills with Indigenous-led training programs
        </p>

        {/* Search */}
        <div className="max-w-[520px] mx-auto relative">
          <input
            type="text"
            placeholder="Search programs, skills, instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-none text-sm font-medium outline-none"
            style={{
              padding: "14px 48px 14px 18px",
              background: "rgba(255,255,255,.95)",
              color: "var(--text)",
            }}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 md:px-10 pt-6">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Category dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl text-sm font-semibold cursor-pointer"
            style={{
              padding: "10px 16px",
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>

          {/* Format pills */}
          <div className="flex gap-2 overflow-x-auto">
            {formats.map((fmt) => {
              const active = selectedFormat === fmt;
              return (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className="px-4 py-2.5 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: active ? "var(--teal)" : "var(--card)",
                    color: active ? "#fff" : "var(--text-sec)",
                    border: active ? "none" : "1px solid var(--border)",
                  }}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured section */}
        {featured.length > 0 &&
          selectedCategory === "All" &&
          selectedFormat === "All" &&
          !searchQuery.trim() && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-text mb-4">
                Featured Programs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((program) => (
                  <ProgramCard key={program.id} program={program} featured />
                ))}
              </div>
            </div>
          )}

        {/* All programs */}
        <h2 className="text-lg font-bold text-text mb-4">
          {selectedCategory !== "All" || selectedFormat !== "All" || searchQuery.trim()
            ? `${filtered.length} Program${filtered.length !== 1 ? "s" : ""} Found`
            : "All Programs"}
        </h2>

        {filtered.length === 0 ? (
          <Card>
            <div style={{ padding: 48 }} className="text-center">
              <p className="text-4xl mb-3">&#128218;</p>
              <h3 className="text-lg font-bold text-text mb-2">
                No programs found
              </h3>
              <p className="text-sm text-text-muted max-w-[360px] mx-auto">
                {searchQuery.trim()
                  ? "Try a different search term or adjust your filters."
                  : "Training programs will appear here soon. Check back for new offerings."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {filtered.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramCard({
  program,
  featured,
}: {
  program: TrainingProgram;
  featured?: boolean;
}) {
  const catStyle = getCategoryStyle(program.category);
  const fmtStyle = formatBadgeColor(program.format);
  const enrollText =
    program.maxEnrollment != null
      ? `${program.enrollmentCount}/${program.maxEnrollment} enrolled`
      : `${program.enrollmentCount} enrolled`;

  return (
    <Link href={`/training/${program.slug}`} className="no-underline">
      <Card
        className="hover:shadow-lg transition-shadow h-full"
        gold={featured}
      >
        {/* Category color bar */}
        <div
          style={{ height: 4, background: catStyle.color }}
        />
        <div style={{ padding: 20 }}>
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              text={program.category}
              color={catStyle.color}
              bg={catStyle.bg}
              small
            />
            <Badge
              text={program.format === "in-person" ? "In-Person" : program.format.charAt(0).toUpperCase() + program.format.slice(1)}
              color={fmtStyle.color}
              bg={fmtStyle.bg}
              small
            />
            {featured && (
              <Badge
                text="Featured"
                color="var(--gold)"
                bg="var(--gold-soft)"
                small
              />
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-text mb-2 line-clamp-2 leading-snug">
            {program.title}
          </h3>

          {/* Instructor */}
          <p className="text-xs text-text-sec mb-3">
            {program.instructor.name}
          </p>

          {/* Duration badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
              style={{ background: "var(--border)", color: "var(--text-sec)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {program.duration}
            </span>
          </div>

          {/* Enrollment + Price */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{enrollText}</span>
            <span
              className="text-sm font-bold"
              style={{
                color:
                  program.price == null ? "var(--green)" : "var(--teal)",
              }}
            >
              {program.price == null ? "Free" : `$${program.price}`}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
