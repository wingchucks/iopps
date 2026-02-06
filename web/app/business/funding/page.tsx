"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedLayout, SectionHeader } from "@/components/opportunity-graph";
import { listBusinessGrants } from "@/lib/firestore";
import type { BusinessGrant, BusinessGrantType, BusinessGrantStatus, NorthAmericanRegion } from "@/lib/types";
import { NORTH_AMERICAN_REGIONS } from "@/lib/types";

const GRANT_TYPES: { value: BusinessGrantType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "startup", label: "Startup" },
  { value: "expansion", label: "Business Expansion" },
  { value: "equipment", label: "Equipment" },
  { value: "training", label: "Training & Development" },
  { value: "export", label: "Export & Trade" },
  { value: "innovation", label: "Innovation & R&D" },
  { value: "green", label: "Green & Sustainability" },
  { value: "women", label: "Women Entrepreneurs" },
  { value: "youth", label: "Youth Entrepreneurs" },
  { value: "general", label: "General Business" },
];

const STATUS_OPTIONS: { value: BusinessGrantStatus | ""; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "active", label: "Currently Open" },
  { value: "upcoming", label: "Opening Soon" },
  { value: "closed", label: "Closed" },
];

export default function BusinessFundingPage() {
  const [grants, setGrants] = useState<BusinessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantType, setGrantType] = useState<BusinessGrantType | "">("");
  const [status, setStatus] = useState<BusinessGrantStatus | "">("");
  const [region, setRegion] = useState<NorthAmericanRegion | "">("");

  useEffect(() => {
    loadGrants();
  }, [grantType, status, region]);

  async function loadGrants() {
    setLoading(true);
    try {
      const grantList = await listBusinessGrants({
        grantType: grantType || undefined,
        status: status || undefined,
        region: region || undefined,
      });
      setGrants(grantList);
    } catch (error) {
      console.error("Failed to load grants:", error);
    } finally {
      setLoading(false);
    }
  }

  const getGrantTypeIcon = (type?: BusinessGrantType) => {
    switch (type) {
      case "startup": return "🚀";
      case "expansion": return "📈";
      case "equipment": return "🔧";
      case "training": return "🎓";
      case "export": return "🌍";
      case "innovation": return "💡";
      case "green": return "🌱";
      case "women": return "👩‍💼";
      case "youth": return "🧑‍💻";
      default: return "💰";
    }
  };

  const getStatusBadge = (grantStatus: BusinessGrantStatus) => {
    switch (grantStatus) {
      case "active":
        return (
          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-600">
            Open
          </span>
        );
      case "upcoming":
        return (
          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-600">
            Coming Soon
          </span>
        );
      case "closed":
        return (
          <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500">
            Closed
          </span>
        );
    }
  };

  const formatDeadline = (deadline: BusinessGrant["deadline"]) => {
    if (!deadline) return null;
    try {
      const date = typeof deadline === "object" && "toDate" in deadline
        ? (deadline as { toDate: () => Date }).toDate()
        : new Date(deadline as string | Date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof deadline === "string" ? deadline : null;
    }
  };

  return (
    <FeedLayout activeNav="business">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <Link href="/business" className="hover:text-slate-900 transition-colors">
          Business
        </Link>
        <span className="mx-2">→</span>
        <span className="text-slate-900">Funding & Grants</span>
      </nav>

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Business
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-slate-900 sm:text-5xl">
          Business Funding & Grants
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
          Discover funding opportunities, grants, and financial programs for Indigenous-owned businesses across North America.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Grant Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Grant Type
            </label>
            <select
              value={grantType}
              onChange={(e) => setGrantType(e.target.value as BusinessGrantType | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              {GRANT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BusinessGrantStatus | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as NorthAmericanRegion | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Regions</option>
              <optgroup label="Canada">
                {NORTH_AMERICAN_REGIONS.slice(0, 13).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
              <optgroup label="United States">
                {NORTH_AMERICAN_REGIONS.slice(13, -1).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
              <option value="National / Online Only">National / Online Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">
          {loading ? "Loading..." : `${grants.length} funding opportunities`}
        </p>
        {(grantType || status || region) && (
          <button
            onClick={() => {
              setGrantType("");
              setStatus("");
              setRegion("");
            }}
            className="text-sm text-[#14B8A6] hover:text-[#16cdb8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grants List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white h-40" />
          ))}
        </div>
      ) : grants.length > 0 ? (
        <div className="space-y-4">
          {grants.map((grant) => (
            <Link
              key={grant.id}
              href={`/business/funding/${grant.slug || grant.id}`}
              className="group flex flex-col sm:flex-row gap-6 rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-300"
            >
              {/* Icon/Logo */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 shrink-0">
                {grant.providerLogo ? (
                  <img
                    src={grant.providerLogo}
                    alt={grant.provider}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <span className="text-2xl">{getGrantTypeIcon(grant.grantType)}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {getStatusBadge(grant.status)}
                  <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 capitalize">
                    {grant.grantType?.replace("_", " ")}
                  </span>
                  {grant.featured && (
                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-600">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#14B8A6] transition-colors">
                  {grant.title}
                </h3>

                <p className="text-sm text-[#14B8A6] font-medium mt-1">
                  {grant.provider}
                </p>

                {grant.shortDescription && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                    {grant.shortDescription}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  {grant.amount?.display && (
                    <span className="text-emerald-600 font-medium">
                      💰 {grant.amount.display}
                    </span>
                  )}
                  {grant.deadline && (
                    <span>📅 Deadline: {formatDeadline(grant.deadline)}</span>
                  )}
                  {grant.eligibility?.indigenousOwned && (
                    <span>🪶 Indigenous-Owned Priority</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden sm:flex items-center">
                <span className="text-sm font-semibold text-[#14B8A6]">View →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <span className="text-5xl mb-4 block">💰</span>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Funding Opportunities</h3>
          <p className="text-slate-500 mb-6">
            {grantType || status || region
              ? "Try adjusting your filters."
              : "Check back soon for business funding opportunities."}
          </p>
          <Link
            href="/business"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Back to Business
          </Link>
        </div>
      )}

      {/* Info Section */}
      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Indigenous Business Grants</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Many government and private organizations offer grants specifically for Indigenous-owned businesses.
            These programs support entrepreneurs in starting, growing, and scaling their ventures.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Application Tips</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            When applying for grants, ensure you have your business registration, financial statements,
            and a clear business plan ready. Many programs also require proof of Indigenous ownership or affiliation.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Know of a Grant Program?
        </h2>
        <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
          Help Indigenous entrepreneurs by suggesting funding programs we should list on IOPPS.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
        >
          Suggest a Grant
        </Link>
      </section>
    </FeedLayout>
  );
}
