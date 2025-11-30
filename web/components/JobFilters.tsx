"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type RemoteWorkOption = "remote" | "hybrid" | "on-site";
export type JobTypeOption = "full-time" | "part-time" | "contract" | "internship";
export type ExperienceLevelOption = "entry" | "mid" | "senior" | "executive";
export type PostedDateOption = "24h" | "7days" | "30days" | "any";

export interface JobFilters {
  salaryMin?: number;
  salaryMax?: number;
  remoteWork: RemoteWorkOption[];
  jobTypes: JobTypeOption[];
  experienceLevel: ExperienceLevelOption[];
  postedDate: PostedDateOption;
  indigenousOwnedOnly: boolean;
  industries: string[];
}

interface JobFiltersProps {
  onFiltersChange?: (filters: JobFilters) => void;
  className?: string;
}

const SALARY_MIN = 0;
const SALARY_MAX = 200000;
const SALARY_STEP = 5000;

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Education",
  "Government",
  "Non-Profit",
  "Construction",
  "Hospitality",
  "Retail",
  "Finance",
  "Manufacturing",
  "Arts & Culture",
  "Legal",
  "Energy",
  "Transportation",
  "Other",
];

/**
 * Job Filters Sidebar Component
 * - Collapsible filter sections
 * - URL-based filter state (query params)
 * - Real-time filter application
 * - Dark theme styling
 */
export default function JobFilters({ onFiltersChange, className = "" }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const [filters, setFilters] = useState<JobFilters>(() => parseFiltersFromURL(searchParams));

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    salary: true,
    remote: true,
    jobType: true,
    experience: true,
    date: true,
    indigenous: true,
    industry: true,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.salaryMin !== undefined) {
      params.set("salaryMin", filters.salaryMin.toString());
    }
    if (filters.salaryMax !== undefined) {
      params.set("salaryMax", filters.salaryMax.toString());
    }
    if (filters.remoteWork.length > 0) {
      params.set("remoteWork", filters.remoteWork.join(","));
    }
    if (filters.jobTypes.length > 0) {
      params.set("jobTypes", filters.jobTypes.join(","));
    }
    if (filters.experienceLevel.length > 0) {
      params.set("experienceLevel", filters.experienceLevel.join(","));
    }
    if (filters.postedDate !== "any") {
      params.set("postedDate", filters.postedDate);
    }
    if (filters.indigenousOwnedOnly) {
      params.set("indigenousOwned", "true");
    }
    if (filters.industries.length > 0) {
      params.set("industries", filters.industries.join(","));
    }

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newURL, { scroll: false });

    // Notify parent component
    onFiltersChange?.(filters);
  }, [filters, router, onFiltersChange]);

  const updateFilter = useCallback(
    <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  const clearAllFilters = () => {
    const defaultFilters: JobFilters = {
      salaryMin: undefined,
      salaryMax: undefined,
      remoteWork: [],
      jobTypes: [],
      experienceLevel: [],
      postedDate: "any",
      indigenousOwnedOnly: false,
      industries: [],
    };
    setFilters(defaultFilters);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#14B8A6] text-xs font-bold text-slate-900">
              {activeFilterCount}
            </span>
          )}
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium text-[#14B8A6] hover:text-[#0F9488]"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Salary Range */}
      <FilterSection
        title="Salary Range"
        expanded={expandedSections.salary}
        onToggle={() => toggleSection("salary")}
      >
        <div className="space-y-4">
          <div className="text-center text-lg font-semibold text-[#14B8A6]">
            ${((filters.salaryMin ?? SALARY_MIN) / 1000).toFixed(0)}k - $
            {((filters.salaryMax ?? SALARY_MAX) / 1000).toFixed(0)}k
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Minimum</label>
              <input
                type="range"
                min={SALARY_MIN}
                max={SALARY_MAX}
                step={SALARY_STEP}
                value={filters.salaryMin ?? SALARY_MIN}
                onChange={(e) => updateFilter("salaryMin", parseInt(e.target.value))}
                className="w-full accent-[#14B8A6]"
              />
              <div className="mt-1 text-center text-sm text-slate-300">
                ${((filters.salaryMin ?? SALARY_MIN) / 1000).toFixed(0)}k
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Maximum</label>
              <input
                type="range"
                min={SALARY_MIN}
                max={SALARY_MAX}
                step={SALARY_STEP}
                value={filters.salaryMax ?? SALARY_MAX}
                onChange={(e) => updateFilter("salaryMax", parseInt(e.target.value))}
                className="w-full accent-[#14B8A6]"
              />
              <div className="mt-1 text-center text-sm text-slate-300">
                ${((filters.salaryMax ?? SALARY_MAX) / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Remote Work */}
      <FilterSection
        title="Remote Work"
        expanded={expandedSections.remote}
        onToggle={() => toggleSection("remote")}
      >
        <div className="flex flex-wrap gap-2">
          {(["remote", "hybrid", "on-site"] as RemoteWorkOption[]).map((option) => (
            <button
              key={option}
              onClick={() =>
                updateFilter("remoteWork", toggleArrayItem(filters.remoteWork, option))
              }
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filters.remoteWork.includes(option)
                  ? "bg-[#14B8A6] text-slate-900"
                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Job Type */}
      <FilterSection
        title="Job Type"
        expanded={expandedSections.jobType}
        onToggle={() => toggleSection("jobType")}
      >
        <div className="space-y-2">
          {(["full-time", "part-time", "contract", "internship"] as JobTypeOption[]).map(
            (option) => (
              <label key={option} className="flex cursor-pointer items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.jobTypes.includes(option)}
                  onChange={() =>
                    updateFilter("jobTypes", toggleArrayItem(filters.jobTypes, option))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">
                  {option
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join("-")}
                </span>
              </label>
            )
          )}
        </div>
      </FilterSection>

      {/* Experience Level */}
      <FilterSection
        title="Experience Level"
        expanded={expandedSections.experience}
        onToggle={() => toggleSection("experience")}
      >
        <div className="flex flex-wrap gap-2">
          {(["entry", "mid", "senior", "executive"] as ExperienceLevelOption[]).map((option) => (
            <button
              key={option}
              onClick={() =>
                updateFilter("experienceLevel", toggleArrayItem(filters.experienceLevel, option))
              }
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filters.experienceLevel.includes(option)
                  ? "bg-[#14B8A6] text-slate-900"
                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Posted Date */}
      <FilterSection
        title="Posted Date"
        expanded={expandedSections.date}
        onToggle={() => toggleSection("date")}
      >
        <div className="space-y-2">
          {[
            { value: "24h" as PostedDateOption, label: "Last 24 hours" },
            { value: "7days" as PostedDateOption, label: "Last 7 days" },
            { value: "30days" as PostedDateOption, label: "Last 30 days" },
            { value: "any" as PostedDateOption, label: "Any time" },
          ].map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center space-x-3">
              <input
                type="radio"
                name="postedDate"
                checked={filters.postedDate === option.value}
                onChange={() => updateFilter("postedDate", option.value)}
                className="h-4 w-4 border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Indigenous-Owned */}
      <FilterSection
        title="Indigenous-Owned"
        expanded={expandedSections.indigenous}
        onToggle={() => toggleSection("indigenous")}
      >
        <label className="flex cursor-pointer items-start space-x-3">
          <input
            type="checkbox"
            checked={filters.indigenousOwnedOnly}
            onChange={(e) => updateFilter("indigenousOwnedOnly", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
          />
          <div>
            <span className="block text-sm font-medium text-slate-300">
              Indigenous-Owned Employers Only
            </span>
            <span className="text-xs text-slate-500">
              Show only jobs from Indigenous-owned organizations
            </span>
          </div>
        </label>
      </FilterSection>

      {/* Industry */}
      <FilterSection
        title="Industry"
        expanded={expandedSections.industry}
        onToggle={() => toggleSection("industry")}
      >
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              onClick={() =>
                updateFilter("industries", toggleArrayItem(filters.industries, industry))
              }
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.industries.includes(industry)
                  ? "bg-[#14B8A6] text-slate-900"
                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

// Filter Section Component with Collapsible functionality
interface FilterSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, expanded, onToggle, children }: FilterSectionProps) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0F172A] p-4 shadow-lg shadow-black/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-semibold text-slate-100">{title}</h3>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && <div className="mt-4">{children}</div>}
    </div>
  );
}

// Helper Functions
function parseFiltersFromURL(searchParams: URLSearchParams): JobFilters {
  return {
    salaryMin: searchParams.get("salaryMin")
      ? parseInt(searchParams.get("salaryMin")!)
      : undefined,
    salaryMax: searchParams.get("salaryMax")
      ? parseInt(searchParams.get("salaryMax")!)
      : undefined,
    remoteWork: searchParams.get("remoteWork")
      ? (searchParams.get("remoteWork")!.split(",") as RemoteWorkOption[])
      : [],
    jobTypes: searchParams.get("jobTypes")
      ? (searchParams.get("jobTypes")!.split(",") as JobTypeOption[])
      : [],
    experienceLevel: searchParams.get("experienceLevel")
      ? (searchParams.get("experienceLevel")!.split(",") as ExperienceLevelOption[])
      : [],
    postedDate: (searchParams.get("postedDate") as PostedDateOption) || "any",
    indigenousOwnedOnly: searchParams.get("indigenousOwned") === "true",
    industries: searchParams.get("industries") ? searchParams.get("industries")!.split(",") : [],
  };
}

function countActiveFilters(filters: JobFilters): number {
  let count = 0;

  if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
    count++;
  }
  if (filters.remoteWork.length > 0) {
    count++;
  }
  if (filters.jobTypes.length > 0) {
    count++;
  }
  if (filters.experienceLevel.length > 0) {
    count++;
  }
  if (filters.postedDate !== "any") {
    count++;
  }
  if (filters.indigenousOwnedOnly) {
    count++;
  }
  if (filters.industries.length > 0) {
    count++;
  }

  return count;
}
