"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { getPosts, type Post } from "@/lib/firestore/posts";
import type { Organization } from "@/lib/firestore/organizations";
import { getVendors, type ShopVendor } from "@/lib/firestore/shop";
import { displayLocation, ensureTagsArray } from "@/lib/utils";

const typeFilters = ["All", "Jobs", "Events", "Scholarships", "Programs", "Organizations", "Businesses", "Stories"];

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

const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest first", value: "newest" },
  { label: "A-Z", value: "az" },
];

function parseSalaryToNumber(salary: string): number | null {
  const cleaned = salary.replace(/[^0-9.kK]/g, "");
  const kMatch = cleaned.match(/^([\d.]+)[kK]$/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const numMatch = cleaned.match(/[\d.]+/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    // If value is small, likely in thousands shorthand
    if (val > 0 && val < 1000) return val * 1000;
    return val;
  }
  return null;
}

function getPostTimestamp(post: Post): number {
  if (post.createdAt && typeof post.createdAt === "object" && "seconds" in post.createdAt) {
    return (post.createdAt as { seconds: number }).seconds * 1000;
  }
  if (post.order) return post.order;
  return 0;
}

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
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [vendors, setVendors] = useState<ShopVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filter state from URL params
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [salaryRange, setSalaryRange] = useState(searchParams.get("salary") || "any");
  const [dateRange, setDateRange] = useState(searchParams.get("date") || "any");
  const [orgFilter, setOrgFilter] = useState(searchParams.get("org") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get("tags");
    return tags ? tags.split(",").filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");

  useEffect(() => {
    async function load() {
      try {
        const [p, orgRes, v] = await Promise.all([
          getPosts(),
          fetch("/api/organizations").then(r => r.json()).catch(() => ({ orgs: [] })),
          getVendors(),
        ]);
        setPosts(p);
        setOrgs(orgRes.orgs ?? []);
        setVendors(v);
      } catch (err) {
        console.error("Failed to load search data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  // Sync filters to URL
  const updateUrl = useCallback(
    (overrides: Record<string, string>) => {
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
        ...overrides,
      };
      for (const [k, v] of Object.entries(state)) {
        if (v && v !== "any" && v !== "All" && v !== "relevance") {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [query, typeFilter, location, salaryRange, dateRange, orgFilter, selectedTags, sortBy, router],
  );

  // Debounced URL update on filter changes
  useEffect(() => {
    const timer = setTimeout(() => updateUrl({}), 300);
    return () => clearTimeout(timer);
  }, [updateUrl]);

  // Collect all tags from posts for the tag filter
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (p.badges) p.badges.forEach((b) => tagSet.add(b));
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  const q = query.toLowerCase().trim();

  // Text-matched posts
  const textFilteredPosts = useMemo(() => {
    if (!q) return [];
    return posts.filter((p) => {
      const text = [p.title, p.orgName, p.orgShort, p.location, p.description, p.jobType, p.eventType, p.community, p.salary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [posts, q]);

  // Text-matched orgs
  const textFilteredOrgs = useMemo(() => {
    if (!q) return [];
    return orgs.filter((o) => {
      const text = [o.name, o.shortName, displayLocation(o.location), o.description, ...ensureTagsArray(o.tags)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [orgs, q]);

  // Apply advanced filters to posts
  const advancedFilteredPosts = useMemo(() => {
    let result = textFilteredPosts;

    // Type filter
    if (typeFilter === "Businesses") {
      // Businesses tab shows only vendors, no posts
      return [];
    }
    if (typeFilter !== "All" && typeFilter !== "Organizations") {
      const typeMap: Record<string, string> = {
        Jobs: "job",
        Events: "event",
        Scholarships: "scholarship",
        Programs: "program",
        Stories: "story",
      };
      const t = typeMap[typeFilter];
      if (t) result = result.filter((p) => p.type === t);
    }

    // Location filter
    if (location.trim()) {
      const loc = location.toLowerCase().trim();
      result = result.filter((p) => p.location && p.location.toLowerCase().includes(loc));
    }

    // Salary range filter (jobs only, keeps non-job posts through)
    if (salaryRange !== "any") {
      const [minStr, maxStr] = salaryRange.split("-");
      const min = minStr ? parseInt(minStr) : 0;
      const max = maxStr ? parseInt(maxStr) : Infinity;
      result = result.filter((p) => {
        if (p.type !== "job") return true;
        if (!p.salary) return false;
        // Try to parse salary — check both numbers in range strings like "$50K - $70K"
        const nums = p.salary.match(/[\d,.]+[kK]?/g);
        if (!nums || nums.length === 0) return false;
        const parsed = nums.map((n) => parseSalaryToNumber(n)).filter((n): n is number => n !== null);
        if (parsed.length === 0) return false;
        const highest = Math.max(...parsed);
        const lowest = Math.min(...parsed);
        // Post matches if any part of its range overlaps with the filter range
        return highest >= min && lowest <= max;
      });
    }

    // Date posted filter
    if (dateRange !== "any") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        "24h": now - 24 * 60 * 60 * 1000,
        "7d": now - 7 * 24 * 60 * 60 * 1000,
        "30d": now - 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        result = result.filter((p) => getPostTimestamp(p) >= cutoff);
      }
    }

    // Organization filter
    if (orgFilter) {
      result = result.filter((p) => p.orgId === orgFilter);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      result = result.filter((p) => {
        if (!p.badges || p.badges.length === 0) return false;
        return selectedTags.some((tag) => p.badges!.includes(tag));
      });
    }

    return result;
  }, [textFilteredPosts, typeFilter, location, salaryRange, dateRange, orgFilter, selectedTags]);

  // Apply sort
  const sortedPosts = useMemo(() => {
    const arr = [...advancedFilteredPosts];
    if (sortBy === "newest") {
      arr.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
    } else if (sortBy === "az") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    // "relevance" keeps the text-match order
    return arr;
  }, [advancedFilteredPosts, sortBy]);

  // Org results filtered by location + org filter
  const filteredOrgs = useMemo(() => {
    let result = textFilteredOrgs;
    if (location.trim()) {
      const loc = location.toLowerCase().trim();
      result = result.filter((o) => displayLocation(o.location).toLowerCase().includes(loc));
    }
    if (orgFilter) {
      result = result.filter((o) => o.id === orgFilter);
    }
    return result;
  }, [textFilteredOrgs, location, orgFilter]);

  // Text-matched vendors
  const filteredVendors = useMemo(() => {
    if (!q) return [];
    let result = vendors.filter((v) => {
      const text = [v.name, v.category, v.description, v.location?.city, v.location?.province]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
    if (location.trim()) {
      const loc = location.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.location?.city?.toLowerCase().includes(loc) ||
          v.location?.province?.toLowerCase().includes(loc)
      );
    }
    return result;
  }, [vendors, q, location]);

  const showOrgs = typeFilter === "All" || typeFilter === "Organizations" || typeFilter === "Businesses";
  const showVendors = typeFilter === "All" || typeFilter === "Businesses";
  const totalResults = sortedPosts.length + (showOrgs ? filteredOrgs.length : 0) + (showVendors ? filteredVendors.length : 0);

  // Count active filters (not counting type filter or sort)
  const activeFilterCount = [
    location.trim() ? 1 : 0,
    salaryRange !== "any" ? 1 : 0,
    dateRange !== "any" ? 1 : 0,
    orgFilter ? 1 : 0,
    selectedTags.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function clearAllFilters() {
    setLocation("");
    setSalaryRange("any");
    setDateRange("any");
    setOrgFilter("");
    setSelectedTags([]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
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
    <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Search Input + Sort */}
      <div className="mb-4">
        <div className="flex gap-3 items-center">
          <div
            className="flex items-center gap-3 rounded-2xl flex-1"
            style={{
              padding: "14px 20px",
              background: "var(--card)",
              border: "2px solid var(--border)",
            }}
          >
            <span className="text-xl text-text-muted">&#128269;</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, events, organizations, programs..."
              className="flex-1 border-none outline-none bg-transparent text-text text-base"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-text-muted text-lg border-none bg-transparent cursor-pointer"
              >
                &#10005;
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="hidden md:block cursor-pointer font-semibold text-[13px]"
            style={{
              padding: "14px 14px",
              borderRadius: 16,
              border: "2px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters + Filter Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className="px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
              style={{
                background: typeFilter === f ? "var(--navy)" : "var(--border)",
                color: typeFilter === f ? "#fff" : "var(--text-sec)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Filters toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
          style={{
            background: showFilters || activeFilterCount > 0 ? "var(--navy)" : "var(--border)",
            color: showFilters || activeFilterCount > 0 ? "#fff" : "var(--text-sec)",
          }}
        >
          <span style={{ fontSize: 14 }}>&#9776;</span>
          Filters
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full font-bold"
              style={{
                width: 18,
                height: 18,
                fontSize: 10,
                background: "var(--teal)",
                color: "#fff",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sort (visible on small screens only) */}
      <div className="mb-4 md:hidden">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full cursor-pointer font-semibold text-[13px]"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1.5px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="mb-5">
          <div style={{ padding: "16px 20px" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text m-0">Advanced Filters</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold border-none bg-transparent cursor-pointer"
                  style={{ color: "var(--teal)" }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or province..."
                  className="outline-none"
                  style={selectStyle}
                />
              </div>

              {/* Salary Range (show for Jobs or All) */}
              {(typeFilter === "All" || typeFilter === "Jobs") && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Salary Range
                  </label>
                  <select
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    style={selectStyle}
                  >
                    {salaryRanges.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Posted */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Date Posted
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  style={selectStyle}
                >
                  {dateRanges.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organization */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Organization
                </label>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">All organizations</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-text-muted mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="px-3 py-1.5 rounded-full border-none text-xs font-semibold cursor-pointer transition-colors"
                        style={{
                          background: active ? "var(--navy)" : "var(--border)",
                          color: active ? "#fff" : "var(--text-sec)",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[80px] rounded-2xl" />
          ))}
        </div>
      ) : !q ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">&#128269;</p>
          <h2 className="text-xl font-bold text-text mb-2">Search IOPPS</h2>
          <p className="text-text-sec text-sm">Find jobs, events, programs, and organizations</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">&#128533;</p>
          <h2 className="text-xl font-bold text-text mb-2">No results for &ldquo;{query}&rdquo;</h2>
          <p className="text-text-sec text-sm">Try different keywords or adjust your filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-muted mb-4">
            {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            {activeFilterCount > 0 && (
              <span> with {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied</span>
            )}
          </p>

          {/* Organization Results */}
          {showOrgs && filteredOrgs.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">ORGANIZATIONS</p>
              <div className="flex flex-col gap-2">
                {filteredOrgs.map((org) => (
                  <Link
                    key={org.id}
                    href={`/${org.type === "school" ? "schools" : "org"}/${org.id}`}
                    className="no-underline"
                  >
                    <Card className="cursor-pointer">
                      <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                        <Avatar
                          name={org.shortName}
                          size={40}
                          gradient={org.type === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                              {org.name}
                            </h3>
                            <Badge
                              text={org.tier === "school" ? "Education" : "Premium"}
                              color={org.tier === "school" ? "var(--teal)" : "var(--gold)"}
                              bg={org.tier === "school" ? "var(--teal-soft)" : "var(--gold-soft)"}
                              small
                            />
                          </div>
                          <p className="text-xs text-text-sec m-0">
                            &#128205; {displayLocation(org.location)} &bull; {org.openJobs} open jobs
                          </p>
                        </div>
                        <span className="text-text-muted">&#8250;</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Business/Vendor Results */}
          {showVendors && filteredVendors.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">BUSINESSES</p>
              <div className="flex flex-col gap-2">
                {filteredVendors.map((vendor) => {
                  const initial = vendor.name?.charAt(0)?.toUpperCase() || "?";
                  const loc = vendor.location
                    ? `${vendor.location.city}, ${vendor.location.province}`
                    : null;
                  return (
                    <Link key={vendor.id} href={`/shop/${vendor.slug}`} className="no-underline">
                      <Card className="cursor-pointer">
                        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--gold), #B45309)" }}
                          >
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {vendor.name}
                              </h3>
                              <Badge text={vendor.category} color="var(--gold)" bg="var(--gold-soft)" small />
                            </div>
                            {loc && (
                              <p className="text-xs text-text-sec m-0">&#128205; {loc}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
                            Visit &#8594;
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Post Results */}
          {sortedPosts.length > 0 && (
            <div>
              {showOrgs && filteredOrgs.length > 0 && (
                <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">POSTS</p>
              )}
              <div className="flex flex-col gap-2">
                {sortedPosts.map((post) => (
                  <SearchResultCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchResultCard({ post }: { post: Post }) {
  const slug = post.id.replace(/^(job|event|scholarship|program|spotlight|story)-/, "");

  const typeConfig: Record<string, { label: string; color: string; bg: string; href: string }> = {
    job: { label: "Job", color: "var(--blue)", bg: "var(--blue-soft)", href: `/jobs/${slug}` },
    event: { label: "Event", color: "var(--gold)", bg: "var(--gold-soft)", href: `/events/${slug}` },
    scholarship: { label: "Scholarship", color: "var(--green)", bg: "var(--green-soft)", href: `/scholarships/${slug}` },
    program: { label: "Program", color: "var(--teal)", bg: "var(--teal-soft)", href: `/programs/${slug}` },
    spotlight: { label: "Spotlight", color: "var(--gold)", bg: "var(--gold-soft)", href: `/stories/${slug}` },
    story: { label: "Story", color: "var(--green)", bg: "var(--green-soft)", href: `/stories/${slug}` },
  };

  const config = typeConfig[post.type] || { label: post.type, color: "var(--text-sec)", bg: "var(--border)", href: "#" };

  return (
    <Link href={config.href} className="no-underline">
      <Card className="cursor-pointer">
        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge text={config.label} color={config.color} bg={config.bg} small />
              {post.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small />
              )}
            </div>
            <h3 className="text-sm font-bold text-text m-0 mb-0.5">{post.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
              {post.orgName && <span>{post.orgName}</span>}
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
              {post.jobType && <span>{post.jobType}</span>}
              {post.salary && <span>{post.salary}</span>}
              {post.amount && <span>&#128176; {post.amount}</span>}
              {post.dates && <span>&#128197; {post.dates}</span>}
              {post.deadline && <span>&#128197; {post.deadline}</span>}
              {post.duration && <span>{post.duration}</span>}
            </div>
          </div>
          <span className="text-text-muted">&#8250;</span>
        </div>
      </Card>
    </Link>
  );
}
