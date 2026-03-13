"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";
import type { Organization } from "@/lib/firestore/organizations";
import { displayLocation, ensureTagsArray } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type TierFilter = "All Partners" | "Premium" | "Education" | "Businesses";
const tierFilters: TierFilter[] = ["All Partners", "Premium", "Education", "Businesses"];

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
  const { user } = useAuth();
  const [filter, setFilter] = useState<TierFilter>("All Partners");
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/partners");
        const data = await res.json();
        setOrgs(data.partners ?? data.orgs ?? []);
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

    list = list.filter((o) => o.isPartner);

    if (filter === "Premium") {
      list = list.filter((o) => o.partnerTier === "premium");
    } else if (filter === "Education") {
      list = list.filter((o) => o.partnerTier === "school");
    } else if (filter === "Businesses") {
      list = list.filter((o) => o.partnerTier !== "school");
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

  const premiumOrgs = useMemo(() => orgs.filter((o) => o.partnerTier === "premium"), [orgs]);
  const educationOrgs = useMemo(() => orgs.filter((o) => o.partnerTier === "school"), [orgs]);
  const visibilityOrgs = useMemo(() => orgs.filter((o) => o.partnerTier === "standard"), [orgs]);
  const showSections = filter === "All Partners" && !search;

  const filterCounts: Record<TierFilter, number> = useMemo(() => ({
    "All Partners": orgs.length,
    "Premium": premiumOrgs.length,
    "Education": educationOrgs.length,
    "Businesses": orgs.filter((o) => o.partnerTier !== "school").length,
  }), [educationOrgs.length, orgs, premiumOrgs.length]);

  return (
    <>
      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 60%, #0D3B66 100%)",
          padding: "clamp(36px, 5vw, 64px) clamp(20px, 6vw, 80px)",
        }}
      >
        <p
          className="inline-block text-[11px] font-extrabold tracking-[3px] text-white/60 mb-3 rounded-full"
          style={{ padding: "5px 16px", background: "rgba(217,119,6,.15)", border: "1px solid rgba(217,119,6,.25)" }}
        >
          PARTNER DIRECTORY
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          Partners Investing in{" "}
          <span style={{ color: "var(--gold)" }}>Indigenous Talent</span>
        </h1>
        <p className="text-base text-white/65 mb-0 max-w-[520px] mx-auto">
          Paid business and school subscribers promoted across IOPPS to help members discover trusted organizations creating opportunities.
        </p>
      </section>

      <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8 pb-24">
        {/* Search bar */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
            &#128269;
          </span>
          <input
            type="text"
            placeholder="Search partners by name, location, or tags..."
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

        {/* Tier filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tierFilters.map((f) => (
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
                <span className="ml-1.5 opacity-60">{filterCounts[f]}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-[200px] rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Search results count */}
            {search && (
              <p className="text-sm text-text-muted mb-4">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;
              </p>
            )}

            {showSections ? (
              <div className="flex flex-col gap-6">
                <PartnerSection
                  title="Premium Partners"
                  description="Highest-visibility partners with premium placement across IOPPS."
                  icon="&#11088;"
                  count={premiumOrgs.length}
                  color="var(--gold)"
                  bg="var(--spotlight-bg)"
                  border="1.5px solid var(--gold-soft)"
                  items={premiumOrgs}
                  spotlight
                />
                <PartnerSection
                  title="Education Partners"
                  description="Schools and education institutions with active partner visibility."
                  icon="&#127891;"
                  count={educationOrgs.length}
                  color="var(--blue)"
                  bg="var(--card)"
                  border="1.5px solid var(--blue-soft)"
                  items={educationOrgs}
                />
                <PartnerSection
                  title="Visibility Partners"
                  description="Businesses and employers investing in promoted visibility across IOPPS."
                  icon="&#128188;"
                  count={visibilityOrgs.length}
                  color="var(--teal)"
                  bg="var(--card)"
                  border="1.5px solid var(--teal-soft)"
                  items={visibilityOrgs}
                />
              </div>
            ) : filtered.length === 0 ? (
              <Card style={{ padding: 40, textAlign: "center" }}>
                <p className="text-text-muted text-sm mb-2">
                  {search
                    ? "No partners match your search."
                    : "No partners found for this filter."}
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
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((org) => (
                    <OrgCard key={org.id} org={org} />
                  ))}
                </div>
            ) : null}
          </>
        )}

        {/* Become a Partner CTA */}
        {!loading && (
          <section
            className="rounded-2xl text-center mt-10 p-8 md:p-10"
            style={{
              background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 60%, #0D3B66 100%)",
              border: "1.5px solid rgba(217,119,6,.2)",
            }}
          >
            <p
              className="inline-block text-[10px] font-extrabold tracking-[3px] rounded-full mb-3"
              style={{ padding: "4px 14px", color: "var(--gold)", background: "rgba(217,119,6,.15)" }}
            >
              PARTNER WITH US
            </p>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2">
              Become an IOPPS Partner
            </h3>
            <p className="text-sm text-white/65 mb-5 max-w-[480px] mx-auto">
              Connect with Indigenous talent and communities across Canada.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-[13px] text-white/50 mb-6 max-w-[500px] mx-auto">
              <span className="flex items-center gap-1.5">&#10003; Unlimited job postings</span>
              <span className="flex items-center gap-1.5">&#10003; Partner directory placement</span>
              <span className="flex items-center gap-1.5">&#10003; Talent access</span>
              <span className="flex items-center gap-1.5">&#10003; Analytics dashboard</span>
            </div>
            <div className="flex justify-center gap-3">
                  <Link href={user ? "/org/dashboard" : "/signup?type=employer"}>
                <Button
                  primary
                  style={{
                    background: "var(--gold)",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    padding: "12px 28px",
                  }}
                >
                  {user ? "Upgrade Your Plan" : "Get Started"}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  style={{
                    color: "#fff",
                    background: "rgba(255,255,255,.1)",
                    borderColor: "rgba(255,255,255,.2)",
                    borderRadius: 12,
                    fontSize: 15,
                    padding: "12px 28px",
                  }}
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function PartnerSection({
  title,
  description,
  icon,
  count,
  color,
  bg,
  border,
  items,
  spotlight = false,
}: {
  title: string;
  description: string;
  icon: string;
  count: number;
  color: string;
  bg: string;
  border: string;
  items: Organization[];
  spotlight?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl p-5" style={{ background: bg, border }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="m-0 text-base font-extrabold text-text">{title}</h3>
        <Badge text={`${count}`} color={color} bg={`${color}20`} small />
      </div>
      <p className="mb-4 text-sm text-text-sec">{description}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((org) => (
          spotlight ? <PremiumSpotlightCard key={org.id} org={org} /> : <OrgCard key={org.id} org={org} />
        ))}
      </div>
    </div>
  );
}

function PremiumSpotlightCard({ org }: { org: Organization }) {
  const href = org.ownerType === "school" ? `/schools/${org.slug || org.id}` : `/org/${org.slug || org.id}`;
  return (
    <Link href={href} className="no-underline">
      <Card gold className="h-full hover:shadow-md">
        <div style={{ padding: 20 }}>
          <div className="flex gap-4 items-start mb-3">
            <Avatar
              name={org.shortName}
              size={56}
              src={org.logoUrl}
              gradient="linear-gradient(135deg, var(--gold), var(--navy))"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-text mb-1 truncate">{org.name}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge text={org.partnerBadgeLabel || "Premium Partner"} color="var(--gold)" bg="var(--gold-soft)" small />
                {org.verified && (
                  <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
                )}
              </div>
            </div>
          </div>
          <p className="text-[13px] text-text-sec mb-3 leading-relaxed line-clamp-2">
            {org.description}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-2">
            {displayLocation(org.location) && (
              <span>&#128205; {displayLocation(org.location)}</span>
            )}
            {org.openJobs > 0 && (
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>
                &#128188; {org.openJobs} open position{org.openJobs !== 1 ? "s" : ""}
              </span>
            )}
            {org.since && <span>Since {org.since}</span>}
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
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function OrgCard({ org }: { org: Organization }) {
  const isSchool = org.ownerType === "school" || org.type === "school" || org.partnerTier === "school";
  const href = isSchool ? `/schools/${org.slug || org.id}` : `/org/${org.slug || org.id}`;
  return (
    <Link href={href} className="no-underline">
      <Card className="cursor-pointer h-full hover:shadow-md">
        <div style={{ padding: 20 }}>
          <div className="flex gap-3 items-start mb-3">
            <Avatar
              name={org.shortName}
              size={48}
              src={org.logoUrl}
              gradient={isSchool ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-text mb-1 truncate">{org.name}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {org.partnerTier === "premium" ? (
                  <Badge text={org.partnerBadgeLabel || "Premium Partner"} color="var(--gold)" bg="var(--gold-soft)" small />
                ) : isSchool ? (
                  <Badge text={org.partnerBadgeLabel || "Education Partner"} color="var(--blue)" bg="var(--blue-soft)" small />
                ) : (
                  <Badge text={org.partnerBadgeLabel || "Partner"} color="var(--teal)" bg="var(--teal-soft)" small />
                )}
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
            {displayLocation(org.location) && (
              <span>&#128205; {displayLocation(org.location)}</span>
            )}
            {org.openJobs > 0 && (
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>
                &#128188; {org.openJobs} open
              </span>
            )}
            {org.since && <span>Since {org.since}</span>}
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
}
