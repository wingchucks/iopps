"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { getAllMembers } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";

interface SavedSearch {
  name: string;
  filters: {
    search: string;
    skillFilter: string[];
    locationFilter: string;
    educationFilter: string;
    workPref: string;
    communityFilter: string;
    openOnly: boolean;
    hasResumeOnly: boolean;
  };
}

const SAVED_SEARCHES_KEY = "iopps_talent_saved_searches";

function loadSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedSearches(searches: SavedSearch[]) {
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

export default function TalentSearchPage() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [educationFilter, setEducationFilter] = useState("");
  const [workPref, setWorkPref] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [hasResumeOnly, setHasResumeOnly] = useState(false);
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await getAllMembers();
      setMembers(all);
      setLoading(false);
    })();
    setSavedSearches(loadSavedSearches());
  }, []);

  const hasActiveFilters =
    search || skillFilter.length > 0 || locationFilter || educationFilter ||
    workPref !== "all" || communityFilter || openOnly || hasResumeOnly;

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    const newSearch: SavedSearch = {
      name: saveSearchName.trim(),
      filters: {
        search,
        skillFilter,
        locationFilter,
        educationFilter,
        workPref,
        communityFilter,
        openOnly,
        hasResumeOnly,
      },
    };
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    persistSavedSearches(updated);
    setSaveSearchName("");
    setShowSaveInput(false);
  };

  const handleLoadSearch = (saved: SavedSearch) => {
    setSearch(saved.filters.search);
    setSkillFilter(saved.filters.skillFilter);
    setLocationFilter(saved.filters.locationFilter);
    setEducationFilter(saved.filters.educationFilter);
    setWorkPref(saved.filters.workPref);
    setCommunityFilter(saved.filters.communityFilter);
    setOpenOnly(saved.filters.openOnly);
    setHasResumeOnly(saved.filters.hasResumeOnly);
  };

  const handleDeleteSearch = (index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    persistSavedSearches(updated);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSkillFilter([]);
    setSkillInput("");
    setLocationFilter("");
    setEducationFilter("");
    setWorkPref("all");
    setCommunityFilter("");
    setOpenOnly(false);
    setHasResumeOnly(false);
  };

  const filtered = useMemo(() => {
    return members.filter((m) => {
      // Filter out org/employer accounts — they have an orgId set
      if (m.orgId) return false;
      // Search by name or skills
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = m.displayName?.toLowerCase().includes(q);
        const skillMatch = m.skills?.some((s) => s.toLowerCase().includes(q));
        if (!nameMatch && !skillMatch) return false;
      }
      // Skills filter
      if (skillFilter.length > 0) {
        const memberSkills = (m.skills || []).map((s) => s.toLowerCase());
        if (!skillFilter.some((sf) => memberSkills.includes(sf.toLowerCase())))
          return false;
      }
      // Location filter
      if (locationFilter) {
        if (
          !m.location?.toLowerCase().includes(locationFilter.toLowerCase())
        )
          return false;
      }
      // Work preference
      if (workPref !== "all") {
        if (m.workPreference !== workPref) return false;
      }
      // Education level filter
      if (educationFilter) {
        const hasMatchingEd = m.education?.some((ed) =>
          ed.degree?.toLowerCase().includes(educationFilter.toLowerCase())
        );
        if (!hasMatchingEd) return false;
      }
      // Community / Nation filter
      if (communityFilter) {
        const q = communityFilter.toLowerCase();
        if (
          !m.community?.toLowerCase().includes(q) &&
          !m.nation?.toLowerCase().includes(q)
        )
          return false;
      }
      // Open to work
      if (openOnly && !m.openToWork) return false;
      // Has resume
      if (hasResumeOnly && !m.resumeUrl) return false;
      return true;
    });
  }, [members, search, skillFilter, locationFilter, educationFilter, communityFilter, workPref, openOnly, hasResumeOnly]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skillFilter.includes(trimmed)) {
      setSkillFilter((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkillFilter((prev) => prev.filter((s) => s !== skill));
  };

  return (
    <OrgRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
          {/* Back link */}
          <Link
            href="/org/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline mb-6 transition-opacity hover:opacity-70"
            style={{ color: "var(--teal)" }}
          >
            &larr; Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: "var(--text)" }}
            >
              Talent Search
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Find skilled community members
            </p>
          </div>

          {/* Filters */}
          <Card className="p-5 mb-6">
            <div className="flex flex-col gap-4">
              {/* Search input */}
              <input
                type="text"
                placeholder="Search by name or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Skills chip input */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Skills
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add skill..."
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl text-sm"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    <button
                      onClick={addSkill}
                      className="px-3 py-2 rounded-xl border-none cursor-pointer text-sm font-semibold"
                      style={{
                        background: "rgba(13,148,136,.1)",
                        color: "var(--teal)",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {skillFilter.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skillFilter.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(13,148,136,.1)",
                            color: "var(--teal)",
                          }}
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="border-none bg-transparent cursor-pointer text-xs leading-none p-0"
                            style={{ color: "var(--teal)" }}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City or province..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                {/* Education Level */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Education Level
                  </label>
                  <select
                    value={educationFilter}
                    onChange={(e) => setEducationFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm cursor-pointer"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="">All</option>
                    <option value="High School">High School</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="Doctorate">Doctorate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Community / Nation */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Community / Nation
                  </label>
                  <input
                    type="text"
                    placeholder="Community or nation..."
                    value={communityFilter}
                    onChange={(e) => setCommunityFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Work Preference */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Work Preference
                  </label>
                  <select
                    value={workPref}
                    onChange={(e) => setWorkPref(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm cursor-pointer"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="all">All</option>
                    <option value="remote">Remote</option>
                    <option value="in-person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Open to Work toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenOnly(!openOnly)}
                  className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0"
                  style={{
                    background: openOnly ? "var(--teal)" : "transparent",
                    border: openOnly
                      ? "none"
                      : "2px solid var(--border)",
                  }}
                >
                  <span
                    className="absolute top-[3px] h-5 w-5 rounded-full transition-all duration-200"
                    style={{
                      background: openOnly ? "#fff" : "var(--text-muted)",
                      left: openOnly ? 24 : 3,
                    }}
                  />
                </button>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Open to Work only
                </span>
              </div>

              {/* Has Resume toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHasResumeOnly(!hasResumeOnly)}
                  className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0"
                  style={{
                    background: hasResumeOnly ? "var(--teal)" : "transparent",
                    border: hasResumeOnly
                      ? "none"
                      : "2px solid var(--border)",
                  }}
                >
                  <span
                    className="absolute top-[3px] h-5 w-5 rounded-full transition-all duration-200"
                    style={{
                      background: hasResumeOnly ? "#fff" : "var(--text-muted)",
                      left: hasResumeOnly ? 24 : 3,
                    }}
                  />
                </button>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Has Resume only
                </span>
              </div>

              {/* Save / Clear actions */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {hasActiveFilters && (
                  <>
                    <button
                      onClick={() => setShowSaveInput(!showSaveInput)}
                      className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                      style={{
                        background: "rgba(139,92,246,.1)",
                        color: "#8B5CF6",
                      }}
                    >
                      Save This Search
                    </button>
                    <button
                      onClick={handleClearFilters}
                      className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                      style={{
                        background: "var(--bg)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>

              {/* Save search name input */}
              {showSaveInput && (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Name this search..."
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveSearch();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveSearch}
                    className="px-3 py-2 rounded-xl border-none cursor-pointer text-xs font-semibold"
                    style={{ background: "var(--teal)", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setSaveSearchName(""); }}
                    className="px-3 py-2 rounded-xl border-none cursor-pointer text-xs font-semibold"
                    style={{
                      background: "var(--bg)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="mb-6">
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Saved Searches
              </p>
              <div className="flex gap-2 flex-wrap">
                {savedSearches.map((saved, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => handleLoadSearch(saved)}
                      className="px-3 py-2 border-none bg-transparent cursor-pointer text-xs font-semibold"
                      style={{ color: "var(--teal)" }}
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSearch(i)}
                      className="pr-2.5 border-none bg-transparent cursor-pointer text-xs leading-none"
                      style={{ color: "var(--text-muted)" }}
                      title="Delete saved search"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 rounded-2xl skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <div
                className="text-4xl mb-3"
                style={{ color: "var(--text-muted)", opacity: 0.4 }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--text)" }}
              >
                No members found
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Try adjusting your search filters
              </p>
            </Card>
          ) : (
            <>
              <p
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                {filtered.length} member{filtered.length !== 1 ? "s" : ""}{" "}
                found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((member) => (
                  <MemberCard key={member.uid} member={member} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
    </OrgRoute>
  );
}

function MemberCard({ member }: { member: MemberProfile }) {
  const initial = member.displayName?.charAt(0)?.toUpperCase() || "?";
  const skills = member.skills || [];
  const visibleSkills = skills.slice(0, 5);
  const moreCount = skills.length - 5;

  return (
    <Card className="p-5 flex flex-col gap-3">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        {member.photoURL ? (
          <img
            src={member.photoURL}
            alt={member.displayName}
            className="w-11 h-11 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--teal), var(--navy))",
            }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold truncate"
            style={{ color: "var(--text)" }}
          >
            {member.displayName}
          </p>
          {member.bio && (
            <p
              className="text-xs truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {member.bio}
            </p>
          )}
        </div>
      </div>

      {/* Open to Work badge */}
      {member.openToWork && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
          style={{ background: "rgba(16,185,129,.12)", color: "#10B981" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "#10B981" }}
          />
          Open to Work
        </span>
      )}

      {/* Skills */}
      {visibleSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(13,148,136,.08)",
                color: "var(--teal)",
              }}
            >
              {skill}
            </span>
          ))}
          {moreCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "var(--bg)",
                color: "var(--text-muted)",
              }}
            >
              +{moreCount} more
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {member.location && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {member.location}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/members/${member.uid}`}
          className="flex-1 py-2 rounded-xl text-center text-xs font-semibold no-underline transition-opacity hover:opacity-80"
          style={{
            background: "rgba(13,148,136,.1)",
            color: "var(--teal)",
          }}
        >
          View Profile
        </Link>
        <Link
          href={`/messages?to=${member.uid}`}
          className="flex-1 py-2 rounded-xl text-center text-xs font-semibold no-underline transition-opacity hover:opacity-80"
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Message
        </Link>
      </div>
    </Card>
  );
}
