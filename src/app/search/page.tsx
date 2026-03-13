"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import ProtectedRoute from "@/components/ProtectedRoute";
import { displayAmount, displayLocation, ensureTagsArray } from "@/lib/utils";

const typeFilters = ["All", "Jobs", "Events", "Scholarships", "Schools", "Training", "Businesses"] as const;
const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest first", value: "newest" },
  { label: "A-Z", value: "az" },
];
const salaryRanges = [
  { label: "Any salary", value: "any" },
  { label: "Under $40K", value: "0-40000" },
  { label: "$40K - $60K", value: "40000-60000" },
  { label: "$60K - $80K", value: "60000-80000" },
  { label: "$80K - $100K", value: "80000-100000" },
  { label: "$100K+", value: "100000-" },
];
const dateRanges = [
  { label: "Any time", value: "any" },
  { label: "Past 24 hours", value: "24h" },
  { label: "Past week", value: "7d" },
  { label: "Past month", value: "30d" },
];

type SearchFilter = (typeof typeFilters)[number];
type OpportunityType = "job" | "event" | "scholarship" | "training";
type DirectoryType = "school" | "business";

interface SearchOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  orgName: string;
  orgId?: string;
  orgSlug?: string;
  locationText: string;
  description: string;
  salary?: string;
  amount?: string;
  dates?: string;
  deadline?: string;
  duration?: string;
  jobType?: string;
  employmentType?: string;
  category?: string;
  tags: string[];
  featured: boolean;
  createdAt: string;
  href: string;
}

interface DirectoryResult {
  id: string;
  type: DirectoryType;
  name: string;
  shortName?: string;
  description: string;
  locationText: string;
  tags: string[];
  indigenousOwned: boolean;
  openJobs: number;
  tier?: string;
  verified?: boolean;
  programCount?: number;
  scholarshipCount?: number;
  trainingCount?: number;
  matchingPrograms?: number;
  isPartner?: boolean;
  partnerTier?: "standard" | "premium" | "school";
  partnerLabel?: string;
  partnerBadgeLabel?: string;
  promotionWeight?: number;
  href: string;
}

interface SchoolProgramIndex {
  id: string;
  title: string;
  ownerId?: string;
  ownerName?: string;
  ownerSlug?: string;
  description: string;
  tags: string[];
}

interface DirectoryFilterOption {
  id: string;
  name: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseSalaryToNumber(salary: string): number | null {
  const cleaned = salary.replace(/[^0-9.kK]/g, "");
  const short = cleaned.match(/^([\d.]+)[kK]$/);
  if (short) return parseFloat(short[1]) * 1000;
  const match = cleaned.match(/[\d.]+/);
  if (!match) return null;
  const parsed = parseFloat(match[0]);
  if (parsed > 0 && parsed < 1000) return parsed * 1000;
  return parsed;
}

function ts(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).seconds === "number") {
    return Number((value as Record<string, unknown>).seconds) * 1000;
  }
  return 0;
}

function matchScore(query: string, values: string[]): number {
  if (!query) return 0;
  return values.reduce((score, value, index) => {
    const normalized = value.toLowerCase();
    if (!normalized) return score;
    if (normalized === query) return score + 20 - index;
    if (normalized.startsWith(query)) return score + 12 - index;
    if (normalized.includes(query)) return score + 6 - index;
    return score;
  }, 0);
}

function extractTags(record: Record<string, unknown>, extras: unknown[] = []): string[] {
  const set = new Set<string>();
  ensureTagsArray(record.tags).forEach((tag) => set.add(tag));
  ensureTagsArray(record.badges).forEach((tag) => set.add(tag));
  extras.forEach((value) => {
    const normalized = text(value);
    if (normalized) set.add(normalized);
  });
  return Array.from(set);
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function normalizeJob(job: Record<string, unknown>): SearchOpportunity {
  return {
    id: String(job.id || job.slug || ""),
    type: "job",
    title: text(job.title),
    orgName: text(job.employerName) || text(job.company) || text(job.orgName),
    orgId: text(job.employerId) || text(job.orgId),
    orgSlug: text(job.orgSlug) || text(job.employerId),
    locationText: displayLocation(job.location || job.workLocation),
    description: text(job.description),
    salary: text(job.salary),
    jobType: text(job.jobType),
    employmentType: text(job.employmentType),
    category: text(job.jobType) || text(job.employmentType),
    tags: extractTags(job, [job.jobType, job.employmentType]),
    featured: Boolean(job.featured),
    createdAt: text(job.updatedAt) || text(job.publishedAt) || text(job.postedAt) || text(job.createdAt),
    href: `/jobs/${job.slug || job.id || ""}`,
  };
}

function normalizeEvent(event: Record<string, unknown>): SearchOpportunity {
  return {
    id: String(event.id || event.slug || ""),
    type: "event",
    title: text(event.title) || text(event.name),
    orgName: text(event.organizer) || text(event.organization) || text(event.orgName) || "IOPPS",
    orgId: text(event.orgId) || text(event.organizationId),
    orgSlug: text(event.orgSlug),
    locationText: [displayLocation(event.location), text(event.city)].filter(Boolean).join(", "),
    description: text(event.description),
    dates: text(event.dates) || text(event.date) || text(event.startDate),
    category: text(event.eventType) || text(event.type),
    tags: extractTags(event, [event.eventType, event.type]),
    featured: Boolean(event.featured),
    createdAt: text(event.createdAt) || text(event.startDate) || text(event.date),
    href: `/events/${event.slug || event.id || ""}`,
  };
}

function normalizeScholarship(scholarship: Record<string, unknown>): SearchOpportunity {
  return {
    id: String(scholarship.id || scholarship.slug || ""),
    type: "scholarship",
    title: text(scholarship.title) || text(scholarship.name),
    orgName: text(scholarship.orgName) || text(scholarship.provider) || text(scholarship.organization),
    orgId: text(scholarship.orgId) || text(scholarship.employerId),
    orgSlug: text(scholarship.orgSlug),
    locationText: displayLocation(scholarship.location),
    description: text(scholarship.description) || text(scholarship.eligibility) || text(scholarship.applicationInstructions),
    amount: displayAmount(scholarship.amount) || displayAmount(scholarship.value),
    deadline: text(scholarship.deadline),
    category: text(scholarship.category) || text(scholarship.type),
    tags: extractTags(scholarship, [scholarship.category, scholarship.type]),
    featured: Boolean(scholarship.featured),
    createdAt: text(scholarship.createdAt),
    href: `/scholarships/${scholarship.slug || scholarship.id || ""}`,
  };
}

function normalizeTraining(program: Record<string, unknown>): SearchOpportunity {
  const orgId = text(program.ownerId) || text(program.orgId);
  return {
    id: String(program.id || ""),
    type: "training",
    title: text(program.title) || text(program.programName),
    orgName: text(program.ownerName) || text(program.orgName) || text(program.provider),
    orgId,
    orgSlug: text(program.ownerSlug) || orgId,
    locationText: [displayLocation(program.location), text(program.region), text(program.campus), text(program.format)].filter(Boolean).join(" · "),
    description: text(program.description),
    duration: text(program.duration),
    category: text(program.credential) || text(program.category),
    tags: extractTags(program, [program.credential, program.category, program.format]),
    featured: Boolean(program.featured),
    createdAt: text(program.createdAt),
    href: text(program.href) || text(program.externalUrl) || `/training/${program.slug || program.id || ""}`,
  };
}

function normalizeSchoolProgram(program: Record<string, unknown>): SchoolProgramIndex {
  return {
    id: String(program.id || ""),
    title: text(program.title) || text(program.programName),
    ownerId: text(program.ownerId) || text(program.orgId),
    ownerName: text(program.ownerName) || text(program.orgName) || text(program.institutionName),
    ownerSlug: text(program.ownerSlug),
    description: text(program.description),
    tags: extractTags(program, [program.credential, program.category, program.format]),
  };
}

function normalizeSchool(school: Record<string, unknown>): DirectoryResult {
  return {
    id: String(school.id || school.slug || ""),
    type: "school",
    name: text(school.name),
    shortName: text(school.shortName),
    description: text(school.description),
    locationText: displayLocation(school.location),
    tags: extractTags(school),
    indigenousOwned: Boolean(school.indigenousOwned),
    openJobs: Number(school.openJobs || 0),
    tier: text(school.tier) || text(school.plan),
    verified: Boolean(school.verified),
    programCount: Number(school.programCount || 0),
    scholarshipCount: Number(school.scholarshipCount || 0),
    isPartner: Boolean(school.isPartner),
    partnerTier: (text(school.partnerTier) || undefined) as DirectoryResult["partnerTier"],
    partnerLabel: text(school.partnerLabel) || undefined,
    partnerBadgeLabel: text(school.partnerBadgeLabel) || undefined,
    promotionWeight: Number(school.promotionWeight || 0),
    href: `/schools/${school.slug || school.id || ""}`,
  };
}

function normalizeBusiness(org: Record<string, unknown>): DirectoryResult | null {
  const type = text(org.type).toLowerCase();
  const tier = text(org.tier).toLowerCase();
  const plan = text(org.plan).toLowerCase();
  if (type === "school" || tier === "school" || plan === "school") return null;

  return {
    id: String(org.id || org.slug || ""),
    type: "business",
    name: text(org.name),
    shortName: text(org.shortName),
    description: text(org.description),
    locationText: displayLocation(org.location),
    tags: extractTags(org, [org.industry, org.type]),
    indigenousOwned: Boolean(org.indigenousOwned),
    openJobs: Number(org.openJobs || 0),
    tier: text(org.tier) || text(org.plan),
    verified: Boolean(org.verified),
    trainingCount: Number(org.trainingCount || 0),
    scholarshipCount: Number(org.scholarshipCount || 0),
    isPartner: Boolean(org.isPartner),
    partnerTier: (text(org.partnerTier) || undefined) as DirectoryResult["partnerTier"],
    partnerLabel: text(org.partnerLabel) || undefined,
    partnerBadgeLabel: text(org.partnerBadgeLabel) || undefined,
    promotionWeight: Number(org.promotionWeight || 0),
    href: `/org/${org.slug || org.id || ""}`,
  };
}

const typeMeta: Record<OpportunityType, { label: string; color: string; bg: string; cta: string }> = {
  job: { label: "Job", color: "var(--blue)", bg: "var(--blue-soft)", cta: "View & Apply" },
  event: { label: "Event", color: "var(--gold)", bg: "var(--gold-soft)", cta: "View Event" },
  scholarship: { label: "Scholarship", color: "var(--green)", bg: "var(--green-soft)", cta: "View Scholarship" },
  training: { label: "Training", color: "var(--teal)", bg: "var(--teal-soft)", cta: "View Training" },
};

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <SearchContent />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawType = searchParams.get("type") || "All";
  const initialType = rawType === "Organizations" ? "Businesses" : rawType === "Programs" ? "Schools" : rawType;

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<SearchFilter>(
    typeFilters.includes(initialType as SearchFilter) ? (initialType as SearchFilter) : "All",
  );
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [salaryRange, setSalaryRange] = useState(searchParams.get("salary") || "any");
  const [dateRange, setDateRange] = useState(searchParams.get("date") || "any");
  const [orgFilter, setOrgFilter] = useState(searchParams.get("org") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get("tags");
    return tags ? tags.split(",").filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [indigenousOnly, setIndigenousOnly] = useState(searchParams.get("indigenous") === "true");
  const [showFilters, setShowFilters] = useState(false);

  const [jobs, setJobs] = useState<SearchOpportunity[]>([]);
  const [events, setEvents] = useState<SearchOpportunity[]>([]);
  const [scholarships, setScholarships] = useState<SearchOpportunity[]>([]);
  const [training, setTraining] = useState<SearchOpportunity[]>([]);
  const [schoolPrograms, setSchoolPrograms] = useState<SchoolProgramIndex[]>([]);
  const [schools, setSchools] = useState<DirectoryResult[]>([]);
  const [businesses, setBusinesses] = useState<DirectoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSearchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [jobsRes, eventsRes, scholarshipsRes, programsRes, trainingRes, schoolsRes, orgsRes] = await Promise.all([
        fetchJson<{ jobs?: Record<string, unknown>[] }>("/api/jobs?limit=300", { jobs: [] }),
        fetchJson<{ events?: Record<string, unknown>[] }>("/api/events", { events: [] }),
        fetchJson<{ scholarships?: Record<string, unknown>[] }>("/api/scholarships", { scholarships: [] }),
        fetchJson<{ programs?: Record<string, unknown>[] }>("/api/programs", { programs: [] }),
        fetchJson<{ training?: Record<string, unknown>[]; programs?: Record<string, unknown>[] }>("/api/training", { training: [] }),
        fetchJson<Record<string, unknown>[] | { schools?: Record<string, unknown>[] }>("/api/schools", []),
        fetchJson<{ orgs?: Record<string, unknown>[] }>("/api/organizations", { orgs: [] }),
      ]);

      const schoolRows = Array.isArray(schoolsRes) ? schoolsRes : (schoolsRes.schools || []);
      setJobs((jobsRes.jobs || []).map(normalizeJob).filter((item) => item.id && item.title));
      setEvents((eventsRes.events || []).map(normalizeEvent).filter((item) => item.id && item.title));
      setScholarships((scholarshipsRes.scholarships || []).map(normalizeScholarship).filter((item) => item.id && item.title));
      setTraining(((trainingRes.training || trainingRes.programs || []) as Record<string, unknown>[]).map(normalizeTraining).filter((item) => item.id && item.title));
      setSchoolPrograms((programsRes.programs || []).map(normalizeSchoolProgram).filter((item) => item.id && item.title));
      setSchools(schoolRows.map(normalizeSchool).filter((item) => item.id && item.name));
      setBusinesses((orgsRes.orgs || []).map(normalizeBusiness).filter((item): item is DirectoryResult => Boolean(item && item.id && item.name)));
    } catch (loadError) {
      console.error("Failed to load search data:", loadError);
      setError("Search is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSearchData();
  }, [loadSearchData]);

  useEffect(() => {
    const nextQuery = searchParams.get("q");
    if (nextQuery !== null) setQuery(nextQuery);
  }, [searchParams]);

  const updateUrl = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    const state: Record<string, string> = {
      q: query,
      type: typeFilter,
      location,
      salary: salaryRange,
      date: dateRange,
      org: orgFilter,
      tags: selectedTags.join(","),
      sort: sortBy,
      indigenous: indigenousOnly ? "true" : "",
      ...overrides,
    };

    for (const [key, value] of Object.entries(state)) {
      if (value && value !== "any" && value !== "All" && value !== "relevance") {
        params.set(key, value);
      }
    }

    router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [dateRange, indigenousOnly, location, orgFilter, query, router, salaryRange, selectedTags, sortBy, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => updateUrl({}), 250);
    return () => clearTimeout(timer);
  }, [updateUrl]);

  const allOpportunities = useMemo(() => [...jobs, ...events, ...scholarships, ...training], [jobs, events, scholarships, training]);
  const allDirectoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: DirectoryFilterOption[] = [...schools, ...businesses]
      .filter((item) => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map((item) => ({ id: item.id, name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return options;
  }, [businesses, schools]);
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    allOpportunities.forEach((item) => item.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [allOpportunities]);

  const normalizedQuery = query.toLowerCase().trim();
  const cutoffMap = useMemo(() => ({
    "24h": Date.now() - 24 * 60 * 60 * 1000,
    "7d": Date.now() - 7 * 24 * 60 * 60 * 1000,
    "30d": Date.now() - 30 * 24 * 60 * 60 * 1000,
  }), []);

  const filteredOpportunities = useMemo(() => {
    const typeMap: Record<SearchFilter, OpportunityType | null> = {
      All: null,
      Jobs: "job",
      Events: "event",
      Scholarships: "scholarship",
      Schools: null,
      Training: "training",
      Businesses: null,
    };

    return allOpportunities
      .filter((item) => {
        if (typeFilter === "Schools" || typeFilter === "Businesses") return false;
        const expectedType = typeMap[typeFilter];
        if (expectedType && item.type !== expectedType) return false;
        if (normalizedQuery && matchScore(normalizedQuery, [item.title, item.orgName, item.locationText, item.description, item.category || "", ...item.tags]) <= 0) return false;
        if (location.trim() && !item.locationText.toLowerCase().includes(location.toLowerCase().trim())) return false;

        if (salaryRange !== "any" && item.type === "job") {
          if (!item.salary) return false;
          const [minStr, maxStr] = salaryRange.split("-");
          const min = minStr ? parseInt(minStr, 10) : 0;
          const max = maxStr ? parseInt(maxStr, 10) : Infinity;
          const numbers = (item.salary.match(/[\d,.]+[kK]?/g) || [])
            .map((value) => parseSalaryToNumber(value))
            .filter((value): value is number => value !== null);
          if (!numbers.length) return false;
          if (Math.max(...numbers) < min || Math.min(...numbers) > max) return false;
        }

        if (dateRange !== "any") {
          const cutoff = cutoffMap[dateRange as keyof typeof cutoffMap];
          const createdAt = ts(item.createdAt || item.dates || item.deadline);
          if (cutoff && (!createdAt || createdAt < cutoff)) return false;
        }

        if (orgFilter) {
          const orgName = allDirectoryOptions.find((option) => option.id === orgFilter)?.name;
          if (!(item.orgId === orgFilter || item.orgSlug === orgFilter || item.orgName === orgName)) return false;
        }

        if (selectedTags.length > 0 && !selectedTags.some((tag) => item.tags.includes(tag))) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "az") return a.title.localeCompare(b.title);
        if (sortBy === "newest") return ts(b.createdAt || b.dates || b.deadline) - ts(a.createdAt || a.dates || a.deadline);
        const aScore = matchScore(normalizedQuery, [a.title, a.orgName, a.locationText, a.description, a.category || "", ...a.tags]) + (a.featured ? 1 : 0);
        const bScore = matchScore(normalizedQuery, [b.title, b.orgName, b.locationText, b.description, b.category || "", ...b.tags]) + (b.featured ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return ts(b.createdAt || b.dates || b.deadline) - ts(a.createdAt || a.dates || a.deadline);
      });
  }, [allDirectoryOptions, allOpportunities, cutoffMap, dateRange, location, normalizedQuery, orgFilter, salaryRange, selectedTags, sortBy, typeFilter]);

  const matchingSchoolPrograms = useMemo(() => {
    const matches = new Map<string, number>();
    if (!normalizedQuery) return matches;

    schoolPrograms.forEach((program) => {
      const score = matchScore(normalizedQuery, [program.title, program.ownerName || "", program.description, ...program.tags]);
      if (score <= 0) return;

      [program.ownerId, program.ownerSlug, program.ownerName].forEach((key) => {
        const normalizedKey = text(key).toLowerCase();
        if (!normalizedKey) return;
        matches.set(normalizedKey, (matches.get(normalizedKey) || 0) + 1);
      });
    });

    return matches;
  }, [normalizedQuery, schoolPrograms]);

  const sortDirectory = useCallback((items: DirectoryResult[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return b.openJobs - a.openJobs;
      if ((a.promotionWeight || 0) !== (b.promotionWeight || 0)) return (b.promotionWeight || 0) - (a.promotionWeight || 0);
      const aScore = matchScore(normalizedQuery, [a.name, a.shortName || "", a.description, a.locationText, ...a.tags]);
      const bScore = matchScore(normalizedQuery, [b.name, b.shortName || "", b.description, b.locationText, ...b.tags]);
      if (aScore !== bScore) return bScore - aScore;
      return b.openJobs - a.openJobs;
    });
  }, [normalizedQuery, sortBy]);

  const filteredSchools = useMemo(() => {
    if (!(typeFilter === "All" || typeFilter === "Schools")) return [];
    return [...schools]
      .map((item) => {
        const programMatches =
          matchingSchoolPrograms.get(item.id.toLowerCase()) ||
          matchingSchoolPrograms.get((item.href.split("/").pop() || "").toLowerCase()) ||
          matchingSchoolPrograms.get(item.name.toLowerCase()) ||
          0;

        return { ...item, matchingPrograms: programMatches };
      })
      .filter((item) => {
        const baseScore = normalizedQuery
          ? matchScore(normalizedQuery, [item.name, item.shortName || "", item.description, item.locationText, ...item.tags])
          : 0;
        if (normalizedQuery && baseScore <= 0 && (item.matchingPrograms || 0) <= 0) return false;
        if (location.trim() && !item.locationText.toLowerCase().includes(location.toLowerCase().trim())) return false;
        if (orgFilter && item.id !== orgFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "az") return a.name.localeCompare(b.name);
        if ((a.promotionWeight || 0) !== (b.promotionWeight || 0)) return (b.promotionWeight || 0) - (a.promotionWeight || 0);
        const aScore = matchScore(normalizedQuery, [a.name, a.shortName || "", a.description, a.locationText, ...a.tags]) + ((a.matchingPrograms || 0) * 8);
        const bScore = matchScore(normalizedQuery, [b.name, b.shortName || "", b.description, b.locationText, ...b.tags]) + ((b.matchingPrograms || 0) * 8);
        if (aScore !== bScore) return bScore - aScore;
        if ((a.programCount || 0) !== (b.programCount || 0)) return (b.programCount || 0) - (a.programCount || 0);
        return b.openJobs - a.openJobs;
      });
  }, [location, matchingSchoolPrograms, normalizedQuery, orgFilter, schools, sortBy, typeFilter]);

  const filteredBusinesses = useMemo(() => {
    if (!(typeFilter === "All" || typeFilter === "Businesses")) return [];
    return sortDirectory(businesses.filter((item) => {
      if (normalizedQuery && matchScore(normalizedQuery, [item.name, item.shortName || "", item.description, item.locationText, ...item.tags]) <= 0) return false;
      if (location.trim() && !item.locationText.toLowerCase().includes(location.toLowerCase().trim())) return false;
      if (orgFilter && item.id !== orgFilter) return false;
      if (indigenousOnly && !item.indigenousOwned) return false;
      return true;
    }));
  }, [businesses, indigenousOnly, location, normalizedQuery, orgFilter, sortDirectory, typeFilter]);

  const totalResults = filteredOpportunities.length + filteredSchools.length + filteredBusinesses.length;
  const activeFilterCount = [location.trim(), salaryRange !== "any", dateRange !== "any", orgFilter, selectedTags.length > 0, indigenousOnly]
    .filter(Boolean)
    .length;
  const shouldLeadWithSchools = typeFilter === "All" && normalizedQuery.length > 0 && filteredSchools.some((school) => (school.matchingPrograms || 0) > 0);
  const shouldLeadWithOpportunities = !shouldLeadWithSchools && typeFilter === "All" && normalizedQuery.length > 0 && filteredOpportunities.length > 0;

  function clearAllFilters() {
    setLocation("");
    setSalaryRange("any");
    setDateRange("any");
    setOrgFilter("");
    setSelectedTags([]);
    setIndigenousOnly(false);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  }

  const selectStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1.5px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div className="mx-auto max-w-[860px] px-4 py-6 md:px-8 md:py-8">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-2xl" style={{ padding: "14px 20px", background: "var(--card)", border: "2px solid var(--border)" }}>
            <span className="text-xl text-text-muted">&#128269;</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search jobs, events, scholarships, schools, training, or businesses..."
              className="flex-1 border-none bg-transparent text-base text-text outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="border-none bg-transparent text-lg text-text-muted">
                &#10005;
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="hidden text-[13px] font-semibold md:block"
            style={{ padding: "14px 14px", borderRadius: 16, border: "2px solid var(--border)", background: "var(--card)", color: "var(--text)" }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {typeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className="whitespace-nowrap rounded-full border-none px-4 py-2 text-[13px] font-semibold"
              style={{ background: typeFilter === filter ? "var(--navy)" : "var(--border)", color: typeFilter === filter ? "#fff" : "var(--text-sec)" }}
            >
              {filter}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters((current) => !current)}
          className="flex items-center gap-1.5 rounded-full border-none px-4 py-2 text-[13px] font-semibold"
          style={{ background: showFilters || activeFilterCount > 0 ? "var(--navy)" : "var(--border)", color: showFilters || activeFilterCount > 0 ? "#fff" : "var(--text-sec)" }}
        >
          <span style={{ fontSize: 14 }}>&#9776;</span>
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full font-bold" style={{ width: 18, height: 18, fontSize: 10, background: "var(--teal)", color: "#fff" }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-4 md:hidden">
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full text-[13px] font-semibold" style={selectStyle}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>Sort: {option.label}</option>
          ))}
        </select>
      </div>

      {showFilters && (
        <Card className="mb-5">
          <div style={{ padding: "16px 20px" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-sm font-bold text-text">Advanced Filters</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="border-none bg-transparent text-xs font-semibold" style={{ color: "var(--teal)" }}>
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-muted">Location</label>
                <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or province..." className="outline-none" style={selectStyle} />
              </div>
              {(typeFilter === "All" || typeFilter === "Jobs") && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-text-muted">Salary Range</label>
                  <select value={salaryRange} onChange={(event) => setSalaryRange(event.target.value)} style={selectStyle}>
                    {salaryRanges.map((range) => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-muted">Date Posted</label>
                <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} style={selectStyle}>
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-muted">Organization</label>
                <select value={orgFilter} onChange={(event) => setOrgFilter(event.target.value)} style={selectStyle}>
                  <option value="">All organizations</option>
                  {allDirectoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              {(typeFilter === "All" || typeFilter === "Businesses") && (
                <div className="flex items-center">
                  <label className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-text">
                    <input type="checkbox" checked={indigenousOnly} onChange={(event) => setIndigenousOnly(event.target.checked)} className="h-4 w-4 accent-teal" />
                    Indigenous-owned only
                  </label>
                </div>
              )}
            </div>
            {availableTags.length > 0 && typeFilter !== "Schools" && typeFilter !== "Businesses" && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-text-muted">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="rounded-full border-none px-3 py-1.5 text-xs font-semibold"
                      style={{ background: selectedTags.includes(tag) ? "var(--navy)" : "var(--border)", color: selectedTags.includes(tag) ? "#fff" : "var(--text-sec)" }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <p className="mb-4 text-5xl">&#9888;&#65039;</p>
            <h2 className="mb-2 text-xl font-bold text-text">Search unavailable</h2>
            <p className="mb-5 text-sm text-text-sec">{error}</p>
            <button onClick={() => void loadSearchData()} className="rounded-xl border-none px-5 py-3 text-sm font-bold text-white" style={{ background: "var(--teal)" }}>
              Try again
            </button>
          </div>
        </Card>
      ) : !normalizedQuery && typeFilter === "All" ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-5xl">&#128269;</p>
          <h2 className="mb-2 text-xl font-bold text-text">Search IOPPS</h2>
          <p className="text-sm text-text-sec">Find jobs, events, scholarships, schools, training, and businesses.</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-5xl">&#128533;</p>
          <h2 className="mb-2 text-xl font-bold text-text">No results for &ldquo;{query || "your filters"}&rdquo;</h2>
          <p className="text-sm text-text-sec">Try different keywords or adjust your filters.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-text-muted">
            {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query || "all content"}&rdquo;
            {activeFilterCount > 0 && <span> with {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied</span>}
          </p>

          {shouldLeadWithSchools && filteredSchools.length > 0 && (
            <ResultSection label="SCHOOLS" description="Colleges, universities, and education partners">
              {filteredSchools.map((result) => (
                <DirectoryResultCard key={`school-${result.id}`} result={result} />
              ))}
            </ResultSection>
          )}

          {shouldLeadWithOpportunities && filteredOpportunities.length > 0 && (
            <ResultSection label="OPPORTUNITIES" description="Top live matches across jobs, events, scholarships, and training">
              {filteredOpportunities.map((result) => (
                <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </ResultSection>
          )}

          {!shouldLeadWithSchools && filteredSchools.length > 0 && (
            <ResultSection label="SCHOOLS" description="Colleges, universities, and education partners">
              {filteredSchools.map((result) => (
                <DirectoryResultCard key={`school-${result.id}`} result={result} />
              ))}
            </ResultSection>
          )}

          {filteredBusinesses.length > 0 && (
            <ResultSection label="BUSINESSES" description="Employers, organizations, and business profiles">
              {filteredBusinesses.map((result) => (
                <DirectoryResultCard key={`business-${result.id}`} result={result} />
              ))}
            </ResultSection>
          )}

          {!shouldLeadWithOpportunities && filteredOpportunities.length > 0 && (
            <ResultSection label="OPPORTUNITIES" description="Live results from jobs, events, scholarships, and training">
              {filteredOpportunities.map((result) => (
                <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </ResultSection>
          )}
        </>
      )}
    </div>
  );
}

function ResultSection({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <p className="text-xs font-bold tracking-[1px] text-text-muted">{label}</p>
        <p className="mt-1 text-xs text-text-sec">{description}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function DirectoryResultCard({ result }: { result: DirectoryResult }) {
  const label = result.type === "school"
    ? (result.partnerTier === "school" ? (result.partnerBadgeLabel || "Education Partner") : "Education")
    : result.isPartner
      ? (result.partnerBadgeLabel || result.partnerLabel || "Partner")
      : "Business";
  const color = result.type === "school"
    ? (result.partnerTier === "school" ? "var(--blue)" : "var(--teal)")
    : result.partnerTier === "premium"
      ? "var(--gold)"
      : result.isPartner
        ? "var(--teal)"
        : "var(--blue)";
  const bg = result.type === "school"
    ? (result.partnerTier === "school" ? "var(--blue-soft)" : "var(--teal-soft)")
    : result.partnerTier === "premium"
      ? "var(--gold-soft)"
      : result.isPartner
        ? "var(--teal-soft)"
        : "var(--blue-soft)";
  const href = result.type === "school" && (result.matchingPrograms || 0) > 0 ? `${result.href}?tab=programs` : result.href;
  const summaryBits = result.type === "school"
    ? [
        result.locationText,
        result.programCount ? `${result.programCount} programs` : "",
        result.scholarshipCount ? `${result.scholarshipCount} scholarships` : "",
        result.openJobs > 0 ? `${result.openJobs} careers` : "",
      ]
    : [
        result.locationText,
        result.trainingCount ? `${result.trainingCount} training` : "",
        result.scholarshipCount ? `${result.scholarshipCount} scholarships` : "",
        result.openJobs > 0 ? `${result.openJobs} open jobs` : "",
      ];

  return (
    <Link href={href} className="no-underline">
      <Card
        className="cursor-pointer"
        style={result.isPartner ? { borderColor: result.partnerTier === "premium" ? "rgba(251,191,36,.24)" : "rgba(20,184,166,.2)" } : undefined}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar
            name={result.shortName || result.name}
            size={40}
            gradient={result.type === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : "linear-gradient(135deg, var(--navy), var(--teal))"}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <h3 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-text">{result.name}</h3>
              <Badge text={label} color={color} bg={bg} small />
              {result.verified && <span className="text-[11px] font-semibold text-teal">&#10003;</span>}
            </div>
            <p className="m-0 text-xs text-text-sec">
              {summaryBits.filter(Boolean).join(" · ")}
            </p>
            {result.type === "school" && (result.matchingPrograms || 0) > 0 && (
              <p className="mt-1 text-[11px] font-semibold" style={{ color: "var(--purple)" }}>
                {result.matchingPrograms} matching program{result.matchingPrograms === 1 ? "" : "s"}
              </p>
            )}
            {result.description && (
              <p className="mt-1 line-clamp-2 text-xs text-text-muted">{result.description}</p>
            )}
            {result.isPartner && (
              <p className="mt-1 text-[11px] font-semibold" style={{ color }}>
                Promoted through IOPPS {result.partnerLabel?.toLowerCase() || "partner plan"}
              </p>
            )}
          </div>
          <span className="text-text-muted">&#8250;</span>
        </div>
      </Card>
    </Link>
  );
}

function SearchResultCard({ result }: { result: SearchOpportunity }) {
  const meta = typeMeta[result.type];

  return (
    <Link href={result.href} className="no-underline">
      <Card className="cursor-pointer">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge text={meta.label} color={meta.color} bg={meta.bg} small />
              {result.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                  Featured
                </span>
              )}
            </div>
            <h3 className="m-0 mb-0.5 text-sm font-bold text-text">{result.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
              {result.orgName && <span>{result.orgName}</span>}
              {result.locationText && <span>&#128205; {result.locationText}</span>}
              {result.jobType && <span>{result.jobType}</span>}
              {result.employmentType && <span>{result.employmentType}</span>}
              {result.salary && <span>{result.salary}</span>}
              {result.amount && <span>&#128176; {result.amount}</span>}
              {result.dates && <span>&#128197; {result.dates}</span>}
              {result.deadline && <span>&#128197; {result.deadline}</span>}
              {result.duration && <span>{result.duration}</span>}
            </div>
            {result.description && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{result.description}</p>}
          </div>
          <span className="text-xs font-semibold" style={{ color: meta.color }}>
            {meta.cta} &#8594;
          </span>
        </div>
      </Card>
    </Link>
  );
}
