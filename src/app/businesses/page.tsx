"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { type Organization } from "@/lib/firestore/organizations";
import { hasOrganizationIndigenousIdentity } from "@/lib/organization-profile";
import { displayLocation, ensureTagsArray } from "@/lib/utils";

type BusinessFilter = "All Businesses" | "Partners" | "Verified" | "Indigenous";

export default function BusinessesPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BusinessFilter>("All Businesses");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/organizations");
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const data = await res.json();
        setOrgs(Array.isArray(data.orgs) ? data.orgs : []);
      } catch (err) {
        console.error("Failed to load businesses:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const businesses = useMemo(() => (
    orgs.filter((org) => org.ownerType !== "school" && org.type !== "school" && org.partnerTier !== "school")
  ), [orgs]);

  const filtered = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return businesses
      .filter((org) => {
        if (filter === "Partners" && !org.isPartner) return false;
        if (filter === "Verified" && !org.verified) return false;
        if (filter === "Indigenous" && !hasOrganizationIndigenousIdentity(org)) return false;
        if (!normalizedQuery) return true;

        return (
          org.name.toLowerCase().includes(normalizedQuery) ||
          org.shortName?.toLowerCase().includes(normalizedQuery) ||
          org.tagline?.toLowerCase().includes(normalizedQuery) ||
          org.description?.toLowerCase().includes(normalizedQuery) ||
          org.industry?.toLowerCase().includes(normalizedQuery) ||
          org.nation?.toLowerCase().includes(normalizedQuery) ||
          org.treatyTerritory?.toLowerCase().includes(normalizedQuery) ||
          displayLocation(org.location).toLowerCase().includes(normalizedQuery) ||
          ensureTagsArray(org.tags).some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          ensureTagsArray(org.services).some((service) => service.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((left, right) => {
        const leftWeight = Number(left.promotionWeight || 0);
        const rightWeight = Number(right.promotionWeight || 0);
        if (leftWeight !== rightWeight) return rightWeight - leftWeight;
        return left.name.localeCompare(right.name);
      });
  }, [businesses, filter, search]);

  const partnerCount = businesses.filter((org) => org.isPartner).length;
  const verifiedCount = businesses.filter((org) => org.verified).length;
  const indigenousCount = businesses.filter((org) => hasOrganizationIndigenousIdentity(org)).length;

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <section
          className="text-center"
          style={{
            background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 58%, #0D3B66 100%)",
            padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
          }}
        >
          <p
            className="mb-3 inline-block rounded-full text-[11px] font-extrabold tracking-[3px]"
            style={{ padding: "5px 16px", color: "var(--teal)", background: "rgba(20,184,166,.12)", border: "1px solid rgba(20,184,166,.22)" }}
          >
            BUSINESS DIRECTORY
          </p>
          <h1 className="mb-2 text-3xl font-extrabold text-white md:text-4xl">
            Businesses & Employers
          </h1>
          <p className="mx-auto mb-0 max-w-[560px] text-base text-white/70">
            Explore employers, organizations, and paid partner businesses creating opportunities across Indigenous communities.
          </p>
        </section>

        <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-10">
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl"
            style={{ padding: "14px 20px", background: "var(--card)", border: "2px solid var(--border)" }}
          >
            <span className="text-xl text-text-muted">&#128269;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses by name, location, or industry..."
              className="flex-1 border-none bg-transparent text-base text-text outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="cursor-pointer border-none bg-transparent text-lg text-text-muted"
              >
                &#10005;
              </button>
            )}
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(["All Businesses", "Partners", "Verified", "Indigenous"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className="rounded-full border-none px-4 py-2 text-[13px] font-semibold"
                style={{
                  background: filter === option ? "var(--navy)" : "var(--border)",
                  color: filter === option ? "#fff" : "var(--text-sec)",
                }}
              >
                {option}
                {option === "Partners" ? ` (${partnerCount})` : ""}
                {option === "Verified" ? ` (${verifiedCount})` : ""}
                {option === "Indigenous" ? ` (${indigenousCount})` : ""}
              </button>
            ))}
          </div>

          {!loading && (
            <p className="mb-4 text-sm text-text-muted">
              {filtered.length} business{filtered.length !== 1 ? "es" : ""} found
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-[240px] rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <p className="mb-3 text-4xl">&#127970;</p>
              <h3 className="mb-2 text-lg font-bold text-text">No businesses found</h3>
              <p className="mx-auto max-w-[420px] text-sm text-text-muted">
                {search || filter !== "All Businesses"
                  ? "Try adjusting your search or filter."
                  : "Business profiles will appear here once added."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((org) => (
                <BusinessCard key={org.id} org={org} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BusinessCard({ org }: { org: Organization }) {
  const location = displayLocation(org.location);
  const isPremium = org.partnerTier === "premium";
  const summary = org.tagline || org.description;
  const trustSignals = [
    org.verified ? "Verified" : "",
    hasOrganizationIndigenousIdentity(org) ? "Indigenous-led" : "",
    org.nation || "",
  ].filter(Boolean);
  const surfaceTags = [
    ...ensureTagsArray(org.tags).slice(0, 2),
    ...ensureTagsArray(org.services).slice(0, 1),
  ];

  return (
    <Link href={`/org/${org.slug || org.id}`} className="no-underline">
      <Card
        className="h-full transition-shadow hover:shadow-lg"
        style={isPremium ? { borderColor: "rgba(251,191,36,.28)", boxShadow: "0 20px 34px -28px rgba(251,191,36,.45)" } : undefined}
      >
        <div style={{ padding: 20 }}>
          <div className="mb-3 flex items-center gap-3">
            <Avatar
              name={org.shortName || org.name}
              size={48}
              src={org.logoUrl || org.logo}
              gradient={isPremium ? "linear-gradient(135deg, var(--gold), var(--navy))" : "linear-gradient(135deg, var(--navy), var(--teal))"}
            />
            <div className="min-w-0 flex-1">
              {/* M-6: allow long org names to wrap to 2 lines instead of
                  chopping mid-word with a whitespace-nowrap ellipsis. */}
              <p
                className="m-0 line-clamp-2 text-[15px] font-bold text-text"
                style={{ overflowWrap: "anywhere" }}
                title={org.name}
              >
                {org.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {org.isPartner ? (
                  <Badge
                    text={org.partnerBadgeLabel || org.partnerLabel || "Partner"}
                    color={org.partnerTier === "premium" ? "var(--gold)" : "var(--teal)"}
                    bg={org.partnerTier === "premium" ? "var(--gold-soft)" : "var(--teal-soft)"}
                    small
                  />
                ) : (
                  <Badge text="Business" color="var(--blue)" bg="var(--blue-soft)" small />
                )}
                {org.industry ? (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-sec)" }}>
                    {org.industry}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {trustSignals.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {trustSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full text-[11px] font-semibold"
                  style={{ padding: "3px 10px", background: "rgba(13,148,136,.08)", border: "1px solid rgba(13,148,136,.12)", color: "var(--teal)" }}
                >
                  {signal}
                </span>
              ))}
            </div>
          )}

          {location && (
            <p className="m-0 mb-2.5 text-xs text-text-sec">
              &#128205; {location}
            </p>
          )}

          {summary && (
            <p
              className="m-0 mb-3 text-xs leading-relaxed text-text-sec"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary}
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold">
            {org.trainingCount ? (
              <span style={{ color: "var(--teal)" }}>{org.trainingCount} training</span>
            ) : null}
            {org.scholarshipCount ? (
              <span style={{ color: "var(--gold)" }}>{org.scholarshipCount} scholarships</span>
            ) : null}
            {org.openJobs > 0 ? (
              <span style={{ color: "var(--blue)" }}>{org.openJobs} open jobs</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {surfaceTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full text-[11px] font-semibold text-teal"
                style={{ padding: "3px 10px", background: "rgba(13,148,136,.08)", border: "1px solid rgba(13,148,136,.12)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}

