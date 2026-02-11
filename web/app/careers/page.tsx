/**
 * IOPPS Careers Page — Enhanced Filtering
 *
 * Jobs + Training programs with comprehensive filtering:
 * - Job Type (Full-time, Part-time, Contract, Internship)
 * - Location (All provinces/territories)
 * - Remote/Hybrid toggle
 * - Salary Range
 * - Date Posted
 * - Indigenous Preference
 * - Category/Industry
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph/dynamic";
import {
  SectionHeader,
  SidebarLinkCard,
  SidebarCTACard,
  colors,
} from "@/components/opportunity-graph";
import type { OpportunityItem } from "@/components/opportunity-graph/OpportunityCard";
import { SearchBarRow, FiltersDrawer } from "@/components/discovery";
import type { FilterGroup } from "@/components/discovery";
import { CAREERS_SIDEBAR_LINKS } from "@/lib/constants/navigation";

// All Canadian provinces and territories
const LOCATION_OPTIONS = [
  { label: "All Locations", value: "" },
  { label: "Alberta", value: "Alberta" },
  { label: "British Columbia", value: "British Columbia" },
  { label: "Manitoba", value: "Manitoba" },
  { label: "New Brunswick", value: "New Brunswick" },
  { label: "Newfoundland and Labrador", value: "Newfoundland and Labrador" },
  { label: "Northwest Territories", value: "Northwest Territories" },
  { label: "Nova Scotia", value: "Nova Scotia" },
  { label: "Nunavut", value: "Nunavut" },
  { label: "Ontario", value: "Ontario" },
  { label: "Prince Edward Island", value: "Prince Edward Island" },
  { label: "Quebec", value: "Quebec" },
  { label: "Saskatchewan", value: "Saskatchewan" },
  { label: "Yukon", value: "Yukon" },
];

const JOB_TYPE_OPTIONS = [
  { label: "Full-time", value: "Full-time" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
  { label: "Internship", value: "Internship" },
  { label: "Casual", value: "Casual" },
];

const DATE_POSTED_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Last 24 hours", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
];

const SALARY_OPTIONS = [
  { label: "Any salary", value: "" },
  { label: "$30,000+", value: "30000" },
  { label: "$50,000+", value: "50000" },
  { label: "$70,000+", value: "70000" },
  { label: "$100,000+", value: "100000" },
];

const CATEGORY_OPTIONS = [
  { label: "All Categories", value: "" },
  { label: "Technology", value: "Technology" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "Education", value: "Education" },
  { label: "Construction", value: "Construction" },
  { label: "Finance", value: "Finance" },
  { label: "Government", value: "Government" },
  { label: "Non-Profit", value: "Non-Profit" },
  { label: "Trades", value: "Trades" },
  { label: "Arts & Culture", value: "Arts & Culture" },
  { label: "Environment", value: "Environment" },
  { label: "Legal", value: "Legal" },
];

function CareersRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="Career Tools"
        icon="briefcase"
        links={CAREERS_SIDEBAR_LINKS}
      />
      <SidebarCTACard
        title="Are you an employer?"
        description="Post jobs and connect with Indigenous talent across Canada."
        buttonLabel="Post a Job"
        buttonHref="/organization/jobs/new"
        gradient={`linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDk} 100%)`}
        buttonTextColor={colors.accent}
      />
    </>
  );
}

export default function CareersPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [jobType, setJobType] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [datePosted, setDatePosted] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [indigenousPreference, setIndigenousPreference] = useState(false);
  const [category, setCategory] = useState("");

  const hasActiveFilters = 
    jobType.length > 0 || 
    location.length > 0 || 
    remoteOnly || 
    datePosted.length > 0 ||
    minSalary.length > 0 ||
    indigenousPreference ||
    category.length > 0;

  const clearFilters = useCallback(() => {
    setJobType([]);
    setLocation("");
    setRemoteOnly(false);
    setDatePosted("");
    setMinSalary("");
    setIndigenousPreference(false);
    setCategory("");
  }, []);

  const filterGroups: FilterGroup[] = [
    {
      id: "jobType",
      label: "Job Type",
      type: "chips",
      options: JOB_TYPE_OPTIONS,
      value: jobType,
      onChange: (v) => setJobType(v as string[]),
    },
    {
      id: "location",
      label: "Location",
      type: "select",
      options: LOCATION_OPTIONS,
      value: location,
      onChange: (v) => setLocation(v as string),
    },
    {
      id: "remote",
      label: "Remote Only",
      type: "toggle",
      value: remoteOnly,
      onChange: (v) => setRemoteOnly(v as boolean),
    },
    {
      id: "datePosted",
      label: "Date Posted",
      type: "select",
      options: DATE_POSTED_OPTIONS,
      value: datePosted,
      onChange: (v) => setDatePosted(v as string),
    },
    {
      id: "salary",
      label: "Minimum Salary",
      type: "select",
      options: SALARY_OPTIONS,
      value: minSalary,
      onChange: (v) => setMinSalary(v as string),
    },
    {
      id: "indigenousPreference",
      label: "Indigenous Preference",
      type: "toggle",
      value: indigenousPreference,
      onChange: (v) => setIndigenousPreference(v as boolean),
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: CATEGORY_OPTIONS,
      value: category,
      onChange: (v) => setCategory(v as string),
    },
  ];

  const filterFn = useMemo(() => {
    return (item: OpportunityItem) => {
      const fd = item.filterData;
      
      // Search filter (searches title, summary, author name)
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          item.title?.toLowerCase().includes(q) ||
          item.summary?.toLowerCase().includes(q) ||
          item.author?.name?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Only apply job-specific filters to jobs
      if (item.type === "job" && fd) {
        // Job type filter
        if (jobType.length > 0) {
          if (!fd.employmentType || !jobType.includes(fd.employmentType)) {
            return false;
          }
        }

        // Location filter (by province)
        if (location) {
          if (!fd.province || fd.province !== location) {
            return false;
          }
        }

        // Remote filter
        if (remoteOnly) {
          if (!fd.remoteFlag) return false;
        }

        // Date posted filter
        if (datePosted && fd.createdAt) {
          const days = parseInt(datePosted, 10);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          if (fd.createdAt < cutoffDate) return false;
        }

        // Salary filter
        if (minSalary) {
          const minSalaryNum = parseInt(minSalary, 10);
          // Check if job has salary info and meets minimum
          if (!fd.salaryMin && !fd.salaryMax) {
            // No salary info - include it (don't filter out jobs without salary)
          } else {
            const jobMax = fd.salaryMax || fd.salaryMin || 0;
            if (jobMax < minSalaryNum) return false;
          }
        }

        // Indigenous preference filter
        if (indigenousPreference) {
          if (!fd.indigenousPreference) return false;
        }

        // Category filter
        if (category) {
          if (!fd.category || fd.category !== category) {
            return false;
          }
        }
      }

      // For programs, apply location filter if set
      if (item.type === "program" && fd && location) {
        if (!fd.province || fd.province !== location) {
          return false;
        }
      }

      return true;
    };
  }, [search, jobType, location, remoteOnly, datePosted, minSalary, indigenousPreference, category]);

  const filterBar = (
    <>
      <SearchBarRow
        placeholder="Search jobs, training programs..."
        value={search}
        onChange={setSearch}
        onFiltersClick={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        variant="content"
      />
      <FiltersDrawer
        isOpen={showFilters}
        filters={filterGroups}
        onClearAll={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </>
  );

  return (
    <FeedLayout activeNav="careers" rightSidebar={<CareersRightSidebar />}>
      <SectionHeader
        title="Careers"
        subtitle="Discover jobs and training programs from employers committed to Indigenous hiring."
        icon="💼"
      />
      <OpportunityFeed
        contentTypes={["job", "program"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        filterBar={filterBar}
        filterFn={filterFn}
        emptyMessage="No career opportunities found matching your filters. Try adjusting your search criteria."
      />
    </FeedLayout>
  );
}
