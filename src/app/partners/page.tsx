"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";
import { displayLocation, ensureTagsArray } from "@/lib/utils";

const filters = ["All", "Employers", "Schools", "Businesses"];

// C-07 & M-16 & M-20: "Businesses" matches anything that's not a school
const filterMap: Record<string, string | string[] | undefined> = {
  All: undefined,
  Employers: "employer",
  Schools: "school",
  Businesses: ["business", "non-profit", "employer", "government"],
};

export default function PartnersPage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <PartnersContent />
      </div>
    </AppShell>
  );
}

function PartnersContent() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrganizations();
        // C-01 & M-21: Only show orgs that completed onboarding or have a tier set
        const partners = data.filter(
          (o) => o.onboardingComplete === true || (o.tier && o.tier.length > 0)
        );
        setOrgs(partners);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = orgs;
    const typeFilter = filterMap[filter];
    if (typeFilter) {
      if (Array.isArray(typeFilter)) {
        list = list.filter((o) => typeFilter.includes(o.type));
      } else {
        list = list.filter((o) => o.type === typeFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          displayLocation(o.location).toLowerCase().includes(q) ||
          (o.description || "").toLowerCase().includes(q) ||
          ensureTagsArray(o.tags).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orgs, filter, search]);

  const featuredSchool = orgs.find((o) => o.type === "school" && o.tier === "school");
  // C-02: Always exclude featured school from grid to prevent duplicate
  const gridOrgs = filtered.filter((o) => o.id !== featuredSchool?.id);

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8 pb-24">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[28px] font-extrabold text-text mb-1">Organizations on IOPPS</h2>
        <p className="text-[15px] text-text-sec mb-1">
          Employers and schools investing in Indigenous talent
        </p>
        <p className="text-teal m-0" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3 }}>
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none"
        >
          &#128269;
        </span>
        <input
          type="text"
          placeholder="Search organizations by name, location, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card text-text text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition-colors"
          style={{ border: "1.5px solid var(--border)" }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm cursor-pointer bg-transparent border-none hover:text-text"
          >
            &#10005;
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors"
            style={{
              border: filter === f ? "none" : "1.5px solid var(--border)",
              background: filter === f ? "var(--navy)" : "var(--card)",
              color: filter === f ? "#fff" : "var(--text-sec)",
            }}
          >
            {f}
            {!loading && (
              <span className="ml-1.5 opacity-60">
                {filterMap[f]
                  ? Array.isArray(filterMap[f])
                    ? orgs.filter((o) => (filterMap[f] as string[]).includes(o.type)).length
                    : orgs.filter((o) => o.type === filterMap[f]).length
                  : orgs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-[160px] rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[180px] rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Featured School Card */}
          {featuredSchool && (filter === "All" || filter === "Schools") && !search && (
            <Link href={`/org/${featuredSchool.id}`} className="no-underline block mb-5">
              <Card className="hover:shadow-md" style={{ border: "2px solid rgba(13,148,136,.15)" }}>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-6">
                  <Avatar
                    name={featuredSchool.shortName}
                    size={72}
                    gradient="linear-gradient(135deg, var(--teal), var(--blue))"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-text m-0">{featuredSchool.name}</h3>
                      <Badge text="Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
                      {featuredSchool.verified && (
                        <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
                      )}
                    </div>
                    <p className="text-sm text-text-sec mb-3 leading-relaxed line-clamp-2">
                      {featuredSchool.description}
                    </p>
                    <div className="flex flex-wrap gap-3 md:gap-5 text-[13px] text-text-sec mb-2.5">
                      <span>&#128205; {displayLocation(featuredSchool.location)}</span>
                      <span>&#128188; {featuredSchool.openJobs} open jobs</span>
                      {featuredSchool.employees && <span>&#128101; {featuredSchool.employees}</span>}
                      {/* L-14: Show program count if available */}
                      {(featuredSchool.programCount || featuredSchool.programs) && (
                        <span>&#128218; {featuredSchool.programCount ?? featuredSchool.programs?.length ?? 0} programs</span>
                      )}
                      <span>Since {featuredSchool.since}</span>
                    </div>
                    {ensureTagsArray(featuredSchool.tags).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {ensureTagsArray(featuredSchool.tags).map((t) => (
                          <span
                            key={t}
                            className="rounded-full text-xs text-teal font-semibold"
                            style={{ padding: "4px 12px", background: "var(--teal-soft)" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 self-center">
                    <Button small primary>View</Button>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* Search results count */}
          {search && (
            <p className="text-sm text-text-muted mb-4">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;
            </p>
          )}

          {/* Org Cards Grid */}
          {gridOrgs.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <p className="text-text-muted text-sm mb-2">
                {search
                  ? "No organizations match your search."
                  : "No organizations found for this filter."}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-teal text-sm font-semibold cursor-pointer bg-transparent border-none hover:underline"
                >
                  Clear search
                </button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridOrgs.map((org) => {
                const isSchool = org.type === "school" || org.tier === "school";
                return (
                  <Link key={org.id} href={`/org/${org.id}`} className="no-underline">
                    <Card className="cursor-pointer h-full hover:shadow-md">
                      <div style={{ padding: 20 }}>
                        <div className="flex gap-3 items-start mb-3">
                          <Avatar
                            name={org.shortName}
                            size={48}
                            gradient={isSchool ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-text mb-1 truncate">{org.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* C-03 & M-02: Tier/type badge */}
                              {org.tier === "premium" ? (
                                <Badge text="Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                              ) : isSchool ? (
                                <Badge text="Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
                              ) : (
                                <Badge
                                  text={org.type === "employer" ? "Employer" : org.type === "non-profit" ? "Non-Profit" : "Business"}
                                  color="var(--gold)"
                                  bg="var(--gold-soft)"
                                  small
                                />
                              )}
                              {/* M-14: Verified is always a separate green badge */}
                              {org.verified && (
                                <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-[13px] text-text-sec mb-3 leading-relaxed line-clamp-2">
                          {org.description}
                        </p>
                        <div className="flex flex-wrap gap-2.5 text-xs text-text-muted mb-3">
                          <span>&#128205; {displayLocation(org.location)}</span>
                          <span>&#128188; {org.openJobs} open</span>
                          <span>Since {org.since}</span>
                        </div>
                        {ensureTagsArray(org.tags).length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {ensureTagsArray(org.tags).slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full text-[11px] font-semibold text-teal"
                                style={{ padding: "3px 10px", background: "var(--teal-soft)" }}
                              >
                                {t}
                              </span>
                            ))}
                            {ensureTagsArray(org.tags).length > 3 && (
                              <span className="text-[11px] text-text-muted font-semibold self-center">
                                +{ensureTagsArray(org.tags).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
