"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { displayAmount } from "@/lib/utils";

const categories = ["All", "Technology", "Business", "Trades", "Health", "Culture"] as const;
const formats = ["All", "Online", "In-Person", "Hybrid"] as const;

interface TrainingProgram {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  format?: string;
  duration?: string;
  enrollmentCount?: number;
  maxEnrollment?: number;
  price?: unknown;
  featured?: boolean;
  active?: boolean;
  provider?: string;
  orgName?: string;
  ownerName?: string;
  ownerSlug?: string;
}

const categoryColors: Record<string, { color: string; bg: string }> = {
  Technology: { color: "var(--blue)", bg: "var(--blue-soft)" },
  Business: { color: "var(--gold)", bg: "var(--gold-soft)" },
  Trades: { color: "var(--green)", bg: "var(--green-soft)" },
  Health: { color: "var(--red)", bg: "var(--red-soft)" },
  Culture: { color: "var(--purple)", bg: "var(--purple-soft)" },
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || { color: "var(--teal)", bg: "var(--teal-soft)" };
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
    async function load() {
      try {
        const response = await fetch("/api/training");
        const payload = response.ok ? await response.json() : { training: [] };
        setPrograms((payload.training || payload.programs || []) as TrainingProgram[]);
      } catch (err) {
        console.error("Failed to load training programs:", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const featured = useMemo(
    () => programs.filter((program) => program.featured && program.active !== false),
    [programs],
  );

  const filtered = useMemo(() => {
    let items = programs.filter((program) => program.active !== false);
    if (selectedCategory !== "All") {
      items = items.filter((program) => program.category === selectedCategory);
    }
    if (selectedFormat !== "All") {
      const normalizedFormat = selectedFormat.toLowerCase();
      items = items.filter((program) => (program.format || "").toLowerCase() === normalizedFormat);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((program) =>
        program.title.toLowerCase().includes(query) ||
        (program.description || "").toLowerCase().includes(query) ||
        (program.provider || "").toLowerCase().includes(query) ||
        (program.orgName || "").toLowerCase().includes(query) ||
        (program.ownerName || "").toLowerCase().includes(query),
      );
    }
    return items;
  }, [programs, searchQuery, selectedCategory, selectedFormat]);
  const hasActiveFilters =
    selectedCategory !== "All" || selectedFormat !== "All" || Boolean(searchQuery.trim());

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <section
          className="text-center"
          style={{
            background:
              "linear-gradient(160deg, var(--teal) 0%, #0F766E 40%, #115E59 70%, var(--teal-light) 100%)",
            padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
          }}
        >
          <h1 className="mb-2 text-3xl font-extrabold text-white md:text-4xl">Training</h1>
          <p className="mx-auto mb-6 max-w-[560px] text-base text-white/70">
            Discover employer, business, and community-led training opportunities across Canada.
          </p>

          <div className="relative mx-auto max-w-[520px]">
            <input
              type="text"
              placeholder="Search training, skills, providers..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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

        <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 md:px-10">
          <div className="mb-6 flex flex-wrap gap-4">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-xl text-sm font-semibold"
              style={{
                padding: "10px 16px",
                background: "var(--card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All Categories" : category}
                </option>
              ))}
            </select>

            <div className="flex gap-2 overflow-x-auto">
              {formats.map((format) => {
                const active = selectedFormat === format;
                return (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className="whitespace-nowrap rounded-xl border-none px-4 py-2.5 text-sm font-semibold"
                    style={{
                      background: active ? "var(--teal)" : "var(--card)",
                      color: active ? "#fff" : "var(--text-sec)",
                      border: active ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {format}
                  </button>
                );
              })}
            </div>
          </div>

          {featured.length > 0 && selectedCategory === "All" && selectedFormat === "All" && !searchQuery.trim() && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-bold text-text">Featured Training</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((program) => (
                  <ProgramCard key={program.id} program={program} featured />
                ))}
              </div>
            </div>
          )}

          <h2 className="mb-4 text-lg font-bold text-text">
            {selectedCategory !== "All" || selectedFormat !== "All" || searchQuery.trim()
              ? `${filtered.length} Training${filtered.length !== 1 ? "s" : ""} Found`
              : "All Training"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-64 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <div className="px-12 py-12 text-center">
                <p className="mb-3 text-4xl">&#128218;</p>
                <h3 className="mb-2 text-lg font-bold text-text">No training found</h3>
                <p className="mx-auto max-w-[360px] text-sm text-text-muted">
                  {hasActiveFilters
                    ? "Try a different search term or reset your filters."
                    : "We're updating the public training directory. You can still explore schools, scholarships, and education resources across IOPPS."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                        setSelectedFormat("All");
                      }}
                      className="rounded-xl border-none px-4 py-2.5 text-sm font-semibold cursor-pointer"
                      style={{ background: "var(--teal)", color: "#fff" }}
                    >
                      Reset filters
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/education"
                        className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
                        style={{ background: "var(--teal)", color: "#fff" }}
                      >
                        Explore Education Hub
                      </Link>
                      <Link
                        href="/schools"
                        className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
                        style={{
                          background: "var(--card)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Browse Schools
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProgramCard({
  program,
  featured,
}: {
  program: TrainingProgram;
  featured?: boolean;
}) {
  const catStyle = getCategoryStyle(program.category || "");
  const fmtStyle = formatBadgeColor((program.format || "").toLowerCase());
  const enrollText =
    program.maxEnrollment != null
      ? `${program.enrollmentCount || 0}/${program.maxEnrollment} enrolled`
      : `${program.enrollmentCount || 0} enrolled`;
  const providerName = program.ownerName || program.orgName || program.provider || "Training provider";
  const priceLabel = displayAmount(program.price);

  return (
    <Link href={`/training/${program.slug || program.id}`} className="no-underline">
      <Card className="h-full transition-shadow hover:shadow-lg" gold={featured}>
        <div style={{ height: 4, background: catStyle.color }} />
        <div style={{ padding: 20 }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {program.category && (
              <Badge text={program.category} color={catStyle.color} bg={catStyle.bg} small />
            )}
            {program.format && (
              <Badge
                text={program.format === "in-person" ? "In-Person" : `${program.format.charAt(0).toUpperCase()}${program.format.slice(1)}`}
                color={fmtStyle.color}
                bg={fmtStyle.bg}
                small
              />
            )}
            {featured && <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small />}
          </div>

          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--teal)" }}>
            {providerName}
          </p>
          <h3 className="mb-2 text-sm font-bold leading-snug text-text">{program.title}</h3>
          {program.description && (
            <p className="mb-3 line-clamp-3 text-xs text-text-sec">{program.description}</p>
          )}

          <div className="mb-3 flex items-center gap-2">
            {program.duration && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
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
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{enrollText}</span>
            <span
              className="text-sm font-bold"
              style={{ color: priceLabel ? "var(--teal)" : "var(--green)" }}
            >
              {priceLabel || "Free"}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
