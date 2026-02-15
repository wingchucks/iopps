"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listMembersForDirectory } from "@/lib/firestore";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Grid3X3,
  List,
  MapPin,
  Users,
  Briefcase,
  Loader2,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import type { MemberProfile } from "@/lib/types";

type ViewMode = "grid" | "list";

// Common skills for filtering
const COMMON_SKILLS = [
  "Project Management",
  "Leadership",
  "Communication",
  "Marketing",
  "Finance",
  "Healthcare",
  "Education",
  "Technology",
  "Construction",
  "Arts & Culture",
];

// Canadian provinces/territories
const LOCATIONS = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

export default function MembersDirectoryPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Load members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMembersForDirectory({
        searchQuery: searchQuery || undefined,
        location: selectedLocation || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        availableOnly,
        limit: 24,
      });
      setMembers(result.members);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLocation, selectedSkills, availableOnly]);

  // Load on mount and filter changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      loadMembers();
    }, 300);

    return () => clearTimeout(debounce);
  }, [loadMembers]);

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Toggle skill filter
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("");
    setSelectedSkills([]);
    setAvailableOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedLocation || selectedSkills.length > 0 || availableOnly;

  return (
    <FeedLayout activeNav="network" fullWidth>
      {/* Header */}
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Community Directory</h1>
              <p className="text-foreground0 text-sm mt-1">
                Connect with Indigenous professionals across Turtle Island
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent/20 text-accent"
                    : "text-foreground0 hover:bg-surface"
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-accent/20 text-accent"
                    : "text-foreground0 hover:bg-surface"
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground0" />
              <Input
                type="text"
                placeholder="Search by name, skills, or affiliation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-primary)] placeholder-slate-500"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-[var(--border)] ${showFilters ? "bg-surface" : ""}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-2 w-2 rounded-full bg-emerald-400" />
              )}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] space-y-4">
              {/* Location Filter */}
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="">All Locations</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Skills Filter */}
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedSkills.includes(skill)
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-surface text-foreground0 border border-[var(--border)] hover:border-[var(--card-border)]"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAvailableOnly(!availableOnly)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    availableOnly ? "bg-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                      availableOnly ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-[var(--text-secondary)]">Show only available for opportunities</span>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm text-foreground0 hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 mx-auto text-[var(--text-secondary)] mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No members found</h3>
            <p className="text-foreground0 mb-4">
              Try adjusting your search or filters
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:border-accent/30 focus-within:border-accent/30 active:border-accent/30 transition-all group"
              >
                {/* Banner */}
                <Link href={`/member/${member.id}`}>
                  <div className="h-20 bg-gradient-to-br from-slate-100 to-slate-200 relative">
                    <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
                  </div>
                </Link>

                <div className="p-4 pt-0 relative">
                  {/* Avatar */}
                  <Link href={`/member/${member.id}`} className="block absolute -top-8 left-4">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-lg hover:border-accent/50 transition-colors">
                      <AvatarImage src={member.avatarUrl || member.photoURL} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {getInitials(member.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="mt-10 mb-4">
                    <Link href={`/member/${member.id}`}>
                      <h3 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
                        {member.displayName}
                      </h3>
                    </Link>

                    {member.indigenousAffiliation && (
                      <p className="text-xs text-accent truncate mt-1">
                        {member.indigenousAffiliation}
                      </p>
                    )}

                    {member.location && (
                      <p className="text-xs text-foreground0 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {member.location}
                      </p>
                    )}

                    {/* Skills Preview */}
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {member.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded bg-surface text-xs text-foreground0"
                          >
                            {skill}
                          </span>
                        ))}
                        {member.skills.length > 3 && (
                          <span className="text-xs text-foreground0">+{member.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {user && user.uid !== member.id && (
                    <ConnectionButton targetUserId={member.id} className="w-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:border-accent/30 focus-within:border-accent/30 active:border-accent/30 transition-all flex items-center gap-4"
              >
                <Link href={`/member/${member.id}`}>
                  <Avatar className="h-14 w-14 border-2 border-white hover:border-accent/50 transition-colors">
                    <AvatarImage src={member.avatarUrl || member.photoURL} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/member/${member.id}`}>
                    <h3 className="font-semibold text-[var(--text-primary)] hover:text-accent transition-colors">
                      {member.displayName}
                    </h3>
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground0 mt-1">
                    {member.indigenousAffiliation && (
                      <span className="text-accent">{member.indigenousAffiliation}</span>
                    )}
                    {member.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {member.location}
                      </span>
                    )}
                    {member.availableForInterviews === "yes" && (
                      <span className="flex items-center gap-1 text-accent">
                        <Briefcase className="h-3 w-3" />
                        Available
                      </span>
                    )}
                  </div>
                  {member.skills && member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded bg-surface text-xs text-foreground0"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/member/${member.id}`}>
                    <Button variant="ghost" size="sm" className="text-foreground0 hover:text-[var(--text-primary)]">
                      View Profile
                    </Button>
                  </Link>
                  {user && user.uid !== member.id && (
                    <ConnectionButton targetUserId={member.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={loadMembers}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </FeedLayout>
  );
}
