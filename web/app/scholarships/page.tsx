"use client";

import { useEffect, useMemo, useState } from "react";
import { listScholarships } from "@/lib/firestore";
import type { Scholarship } from "@/lib/types";

const fallbackScholarships: Scholarship[] = [
  {
    id: "sample-sch-1",
    employerId: "demo",
    employerName: "PrairieTech Solutions",
    title: "STEM Horizons Indigenous Scholarship",
    provider: "PrairieTech Solutions",
    description:
      "Supports Indigenous students pursuing STEM degrees with mentorship and paid summer placements.",
    amount: "$10,000",
    deadline: "Feb 15, 2025",
    level: "Post-secondary",
    region: "Western Canada",
    type: "Scholarship",
    active: true,
  },
  {
    id: "sample-sch-2",
    employerId: "demo",
    employerName: "Northern Lights Friendship Centre",
    title: "Northern Wellness Community Grant",
    provider: "Northern Lights Friendship Centre",
    description:
      "Funding for community groups delivering culturally grounded wellness programming.",
    amount: "$25,000",
    deadline: "Mar 01, 2025",
    level: "Community",
    region: "Northern Canada",
    type: "Grant",
    active: true,
  },
  {
    id: "sample-sch-3",
    employerId: "demo",
    employerName: "Coastal Nations Education Trust",
    title: "Emerging Indigenous Leaders Bursary",
    provider: "Coastal Nations Education Trust",
    description:
      "Helps Indigenous graduate students attend leadership and governance programs.",
    amount: "$7,500",
    deadline: "Jan 10, 2025",
    level: "Graduate",
    region: "British Columbia",
    type: "Bursary",
    active: true,
  },
];

const typeFilters = ["All", "Scholarship", "Grant", "Bursary"] as const;
const levelFilters = [
  "All",
  "High School",
  "Post-secondary",
  "Graduate",
  "Community",
] as const;

const toDateValue = (
  value: Scholarship["deadline"]
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }
  return null;
};

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] =
    useState<Scholarship[]>(fallbackScholarships);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<(typeof typeFilters)[number]>("All");
  const [levelFilter, setLevelFilter] =
    useState<(typeof levelFilters)[number]>("All");
  const [regionFilter, setRegionFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listScholarships();
        setScholarships(
          data.length ? data : fallbackScholarships
        );
      } catch (err) {
        console.error(err);
        setError("We couldn't load scholarships right now.");
        setScholarships(fallbackScholarships);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return scholarships.filter((item) => {
      const matchesKeyword = `${item.title} ${item.provider} ${item.description}`
        .toLowerCase()
        .includes(keyword.toLowerCase());
      const matchesType =
        typeFilter === "All" ? true : item.type === typeFilter;
      const matchesLevel =
        levelFilter === "All" ? true : item.level === levelFilter;
      const matchesRegion = regionFilter
        ? (item.region ?? "")
            .toLowerCase()
            .includes(regionFilter.toLowerCase())
        : true;
      return matchesKeyword && matchesType && matchesLevel && matchesRegion;
    });
  }, [keyword, levelFilter, regionFilter, scholarships, typeFilter]);

  const formatDeadline = (value: Scholarship["deadline"]) => {
    const date = toDateValue(value);
    if (date) {
      return date.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return typeof value === "string" ? value : undefined;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
          Scholarships & Grants
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Funding Indigenous learners and community leaders
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Browse scholarships, bursaries, and community grants submitted by
          employers and partners across Turtle Island.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Health, engineering, governance..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Award type
            </label>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as (typeof typeFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {typeFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Level
            </label>
            <select
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as (typeof levelFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {levelFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Region
            </label>
            <input
              type="text"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              placeholder="Prairies, BC, Atlantic..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setTypeFilter("All");
              setLevelFilter("All");
              setRegionFilter("");
            }}
            className="text-xs font-semibold text-teal-300 underline"
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No scholarships match your filters yet. Employers will keep adding
            new opportunities—check back soon or adjust filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-teal-400"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
                      {item.type}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-50">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {item.provider}
                    </p>
                  </div>
                  <div className="text-sm text-right text-slate-300">
                    {item.amount && (
                      <p className="font-semibold text-teal-300">
                        {item.amount}
                      </p>
                    )}
                    {formatDeadline(item.deadline) && (
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Deadline {formatDeadline(item.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  {item.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-3 py-1">
                    {item.level}
                  </span>
                  {item.region && (
                    <span className="rounded-full border border-slate-700 px-3 py-1">
                      {item.region}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
