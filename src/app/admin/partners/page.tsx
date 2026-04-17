"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { displayLocation } from "@/lib/utils";
import toast from "react-hot-toast";

type AdminFilter = "all" | "listed" | "eligible";

interface PartnerCandidate {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  ownerType: string;
  verified: boolean;
  status: string;
  publicVisibility: string;
  isPublicPartner: boolean;
  isEligibleForPublicPartner: boolean;
  eligibilityReason:
    | "active_paid_subscription"
    | "legacy_directory_partner"
    | "trial_only"
    | "admin_grant"
    | "expired"
    | "not_public"
    | "no_paid_subscription";
  subscriptionTier: "standard" | "premium" | "school" | null;
  subscriptionStatus: string;
  subscriptionEnd?: string;
  spotlight: boolean;
  sectionOverride?: "premium" | "education" | "visibility";
  partnerBadgeLabel?: string;
  location?: unknown;
}

function prettifyTier(value: PartnerCandidate["subscriptionTier"]): string {
  if (value === "premium") return "Premium plan";
  if (value === "school") return "School plan";
  if (value === "standard") return "Standard plan";
  return "No paid plan";
}

function prettifyType(value: string): string {
  if (!value) return "Organization";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function prettifyEligibilityReason(value: PartnerCandidate["eligibilityReason"]): string {
  if (value === "active_paid_subscription") return "Active paid subscription";
  if (value === "legacy_directory_partner") return "Legacy premium directory partner";
  if (value === "trial_only") return "Trial only";
  if (value === "admin_grant") return "Complimentary access";
  if (value === "expired") return "Expired subscription";
  if (value === "not_public") return "Not public";
  return "No paid subscription";
}

function qualifiesForPublicListing(candidate: PartnerCandidate): boolean {
  return candidate.isEligibleForPublicPartner;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch("/api/admin/partners", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setPartners(Array.isArray(data.partners) ? data.partners : []);
      } catch (error) {
        console.error("[admin/partners] load failed", error);
        toast.error("Failed to load partner settings");
      } finally {
        setLoading(false);
      }
    }

    if (user) void load();
  }, [user]);

  const stats = useMemo(() => {
    const listed = partners.filter((partner) => partner.isPublicPartner).length;
    const eligible = partners.filter((partner) => qualifiesForPublicListing(partner)).length;
    const blocked = partners.filter((partner) => partner.subscriptionTier !== null && !partner.isEligibleForPublicPartner).length;
    return { listed, eligible, blocked, total: partners.length };
  }, [partners]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return partners.filter((partner) => {
      if (filter === "listed" && !partner.isPublicPartner) return false;
      if (filter === "eligible" && !qualifiesForPublicListing(partner)) return false;

      if (!query) return true;

      return (
        partner.name.toLowerCase().includes(query) ||
        partner.ownerType.toLowerCase().includes(query) ||
        (partner.description || "").toLowerCase().includes(query) ||
        displayLocation(partner.location).toLowerCase().includes(query)
      );
    });
  }, [filter, partners, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text">Partner Directory Settings</h1>
        <p className="max-w-3xl text-sm leading-6 text-text-muted">
          Public partners are now derived automatically from billing state. An organization only appears in partner
          surfaces when it has an active paid subscription, is publicly visible, and is not on complimentary or trial access.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracked organizations" value={stats.total} tone="default" />
        <StatCard label="Public partners live" value={stats.listed} tone="teal" />
        <StatCard label="Eligible paid orgs" value={stats.eligible} tone="gold" />
        <StatCard label="Blocked non-paid states" value={stats.blocked} tone="blue" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm text-text-muted">&#128269;</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search partner candidates by name, type, or location..."
            className="w-full border-none bg-transparent text-sm text-text outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["listed", "Public"],
            ["eligible", "Eligible"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="rounded-full px-4 py-2 text-xs font-semibold transition-colors"
              style={{
                background: filter === value ? "var(--navy)" : "var(--card)",
                color: filter === value ? "#fff" : "var(--text-sec)",
                border: filter === value ? "none" : "1px solid var(--border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-[220px] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-text-muted">No matching organizations found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((partner) => {
            const eligible = qualifiesForPublicListing(partner);
            const location = displayLocation(partner.location);

            return (
              <article key={partner.id} className="rounded-[24px] border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  <Avatar
                    name={partner.shortName || partner.name}
                    src={partner.logoUrl}
                    size={52}
                    gradient="linear-gradient(135deg, var(--navy), var(--teal))"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-text">{partner.name}</h2>
                      {partner.isPublicPartner ? (
                        <StatusBadge label={partner.partnerBadgeLabel || "Public Partner"} tone="gold" />
                      ) : partner.isEligibleForPublicPartner ? (
                        <StatusBadge label="Eligible paid org" tone="teal" />
                      ) : null}
                      {partner.verified ? <StatusBadge label="Verified" tone="blue" /> : null}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {prettifyType(partner.ownerType)} · {prettifyTier(partner.subscriptionTier)}
                    </p>
                    {location ? <p className="mt-1 text-xs text-text-sec">&#128205; {location}</p> : null}
                  </div>
                </div>

                {partner.description ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-text-sec">{partner.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge label={`Status: ${partner.status || "unknown"}`} tone={partner.status === "approved" ? "teal" : "default"} />
                  <StatusBadge label={`Visibility: ${partner.publicVisibility || "public"}`} tone={partner.publicVisibility === "hidden" ? "default" : "blue"} />
                  <StatusBadge label={`Subscription: ${partner.subscriptionStatus || "none"}`} tone={eligible ? "gold" : "default"} />
                  <StatusBadge label={prettifyEligibilityReason(partner.eligibilityReason)} tone={eligible ? "gold" : "default"} />
                  {partner.spotlight ? <StatusBadge label="Spotlight enabled" tone="teal" /> : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-text-muted">
                  {partner.isPublicPartner
                    ? "This organization is live in the public partner directory and will appear consistently across partner surfaces."
                    : partner.eligibilityReason === "legacy_directory_partner"
                      ? "This organization is a grandfathered premium directory partner and remains live even though it is not on a current paid subscription record."
                    : partner.eligibilityReason === "trial_only"
                      ? "Trial access no longer qualifies for the public partner directory. This organization will only go live after a real paid subscription becomes active."
                      : partner.eligibilityReason === "admin_grant"
                        ? "Complimentary or admin-granted access does not qualify for the public partner directory."
                        : partner.eligibilityReason === "expired"
                          ? "The subscription term has ended, so this organization has been removed automatically from public partner surfaces."
                          : partner.eligibilityReason === "not_public"
                            ? "This organization is not currently public, so it cannot appear in the public partner directory even with a paid subscription."
                            : eligible
                              ? "This organization qualifies for the public directory and will appear automatically across partner surfaces."
                              : "This organization does not have an active paid subscription that qualifies for public partner placement."}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  {partner.subscriptionEnd ? (
                    <span className="text-sm text-text-muted">
                      Subscription end: {new Date(partner.subscriptionEnd).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">
                      {partner.sectionOverride ? `Section override: ${partner.sectionOverride}` : "No subscription end on file"}
                    </span>
                  )}

                  {partner.websiteUrl ? (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-teal no-underline hover:underline"
                    >
                      Open website
                    </a>
                  ) : (
                    <span className="text-sm text-text-muted">No website on file</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "teal" | "gold" | "blue";
}) {
  const color =
    tone === "teal" ? "var(--teal)" :
    tone === "gold" ? "var(--gold)" :
    tone === "blue" ? "var(--blue)" :
    "var(--text)";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "teal" | "gold" | "blue";
}) {
  const styles =
    tone === "teal"
      ? { color: "var(--teal)", background: "var(--teal-soft)" }
      : tone === "gold"
        ? { color: "var(--gold)", background: "var(--gold-soft)" }
        : tone === "blue"
          ? { color: "var(--blue)", background: "var(--blue-soft)" }
          : { color: "var(--text-sec)", background: "rgba(255,255,255,.05)" };

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
      style={styles}
    >
      {label}
    </span>
  );
}
