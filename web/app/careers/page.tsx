/**
 * IOPPS Careers Page — Social Feed Pattern
 *
 * Jobs + Training programs displayed through the unified feed layout
 * with search bar, job type filter, location filter, and remote toggle.
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

const JOB_TYPE_OPTIONS = [
  { label: "Full-time", value: "Full-time" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
  { label: "Internship", value: "Internship" },
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
  const [jobType, setJobType] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [location, setLocation] = useState("");

  const hasActiveFilters = jobType.length > 0 || remoteOnly || location.length > 0;

  const clearFilters = useCallback(() => {
    setJobType([]);
    setRemoteOnly(false);
    setLocation("");
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
      options: [
        { label: "All Locations", value: "" },
        { label: "Alberta", value: "Alberta" },
        { label: "British Columbia", value: "British Columbia" },
        { label: "Manitoba", value: "Manitoba" },
        { label: "Ontario", value: "Ontario" },
        { label: "Saskatchewan", value: "Saskatchewan" },
        { label: "Quebec", value: "Quebec" },
      ],
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
  ];

  const filterFn = useMemo(() => {
    return (item: OpportunityItem) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          item.title?.toLowerCase().includes(q) ||
          item.summary?.toLowerCase().includes(q) ||
          item.author?.name?.toLowerCase().includes(q) ||
          item.meta?.mode?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Job type filter
      if (jobType.length > 0 && item.meta?.type) {
        if (!jobType.includes(item.meta.type)) return false;
      } else if (jobType.length > 0 && !item.meta?.type) {
        return false;
      }

      // Remote filter
      if (remoteOnly) {
        const mode = item.meta?.mode?.toLowerCase() || "";
        if (!mode.includes("remote")) return false;
      }

      // Location filter
      if (location) {
        const mode = item.meta?.mode?.toLowerCase() || "";
        const locationLower = location.toLowerCase();
        if (!mode.includes(locationLower)) return false;
      }

      return true;
    };
  }, [search, jobType, remoteOnly, location]);

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
        emptyMessage="No career opportunities found right now. Check back soon!"
      />
    </FeedLayout>
  );
}
