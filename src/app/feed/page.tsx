"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  selectFeaturedOpportunityItems,
  sortByRecencyWithFeaturedBoost,
} from "@/lib/public-featured";

type FeedItemType = "job" | "program" | "event" | "scholarship";

interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  orgName: string;
  orgLogo?: string;
  orgSlug?: string;
  subtitle?: string;
  detail?: string;
  badge?: string;
  href: string;
  createdAt?: string;
  featured?: boolean;
}

const TYPE_META: Record<FeedItemType, { label: string; icon: string }> = {
  job: { label: "Jobs", icon: "💼" },
  program: { label: "Programs", icon: "📚" },
  event: { label: "Events", icon: "📅" },
  scholarship: { label: "Scholarships", icon: "🎓" },
};

async function fetchJobs(): Promise<FeedItem[]> {
  const res = await fetch("/api/jobs?limit=40");
  if (!res.ok) return [];
  const data = await res.json();
  const jobs = Array.isArray(data) ? data : (data.jobs || []);
  return jobs.map((job: Record<string, unknown>) => ({
    id: String(job.id || job.slug || ""),
    type: "job" as FeedItemType,
    title: String(job.title || ""),
    orgName: String(job.employerName || job.company || job.orgName || ""),
    orgLogo: (job.employerLogoUrl as string) || (job.logoUrl as string) || (job.companyLogoUrl as string) || "",
    orgSlug: (job.orgSlug as string) || (job.employerId as string) || "",
    subtitle: [job.location, job.workLocation].filter(Boolean).join(" · "),
    detail: (job.salary as string) || "",
    badge: (job.employmentType as string) || (job.jobType as string) || "",
    href: `/jobs/${job.slug || job.id || ""}`,
    createdAt: (job.createdAt as string) || (job.postedAt as string) || "",
    featured: Boolean(job.featured),
  }));
}

async function fetchPrograms(): Promise<FeedItem[]> {
  const res = await fetch("/api/programs");
  if (!res.ok) return [];
  const data = await res.json();
  const programs = data.programs || [];
  return programs.map((program: Record<string, unknown>) => ({
    id: String(program.id || ""),
    type: "program" as FeedItemType,
    title: String(program.title || ""),
    orgName: String(program.orgName || ""),
    orgLogo: (program.orgLogoUrl as string) || "",
    orgSlug: (program.orgId as string) || "",
    subtitle: [program.location, program.format].filter(Boolean).join(" · "),
    detail: (program.duration as string) || "",
    badge: (program.credential as string) || (program.category as string) || "",
    href: (program.externalUrl as string) || `/schools/${program.orgId}`,
    createdAt: (program.createdAt as string) || "",
    featured: Boolean(program.featured),
  }));
}

async function fetchEvents(): Promise<FeedItem[]> {
  const res = await fetch("/api/events");
  if (!res.ok) return [];
  const data = await res.json();
  const events = Array.isArray(data) ? data : (data.events || []);
  return events.map((event: Record<string, unknown>) => ({
    id: String(event.id || ""),
    type: "event" as FeedItemType,
    title: String(event.title || event.name || ""),
    orgName: String(event.organizer || event.organization || "IOPPS"),
    orgLogo: (event.logoUrl as string) || (event.imageUrl as string) || (event.posterUrl as string) || "",
    subtitle: [event.location, event.city].filter(Boolean).join(", "),
    detail: (event.date as string) || (event.startDate as string) || (event.dates as string) || "",
    badge: (event.eventType as string) || (event.type as string) || "",
    href: `/events/${event.id || event.slug}`,
    createdAt: (event.createdAt as string) || (event.date as string) || (event.startDate as string) || "",
    featured: Boolean(event.featured),
  }));
}

async function fetchScholarships(): Promise<FeedItem[]> {
  const res = await fetch("/api/scholarships");
  if (!res.ok) return [];
  const data = await res.json();
  const scholarships = Array.isArray(data) ? data : (data.scholarships || []);
  return scholarships
    .filter((scholarship: Record<string, unknown>) => scholarship.status === "active" || !scholarship.status)
    .map((scholarship: Record<string, unknown>) => ({
      id: String(scholarship.id || ""),
      type: "scholarship" as FeedItemType,
      title: String(scholarship.title || scholarship.name || ""),
      orgName: String(scholarship.provider || scholarship.organization || scholarship.orgName || ""),
      orgLogo: (scholarship.logoUrl as string) || "",
      subtitle: scholarship.deadline ? `Deadline: ${scholarship.deadline}` : String(scholarship.eligibility || ""),
      detail: (scholarship.amount as string) || (scholarship.value as string) || "",
      badge: (scholarship.category as string) || (scholarship.type as string) || "",
      href: (scholarship.applicationUrl as string) || (scholarship.url as string) || "/scholarships",
      createdAt: (scholarship.createdAt as string) || "",
      featured: Boolean(scholarship.featured),
    }));
}

function OrgAvatar({ logo, name, size = 40 }: { logo?: string; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          objectFit: "contain",
          background: "#111827",
          padding: 4,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        flexShrink: 0,
        background: "linear-gradient(135deg, #14B8A6, #0F766E)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 700,
        color: "#FFFFFF",
      }}
    >
      {initials}
    </div>
  );
}

function TypeBadge({ type }: { type: FeedItemType }) {
  const meta = TYPE_META[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#14B8A6]/25 bg-[#0D9488]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#99F6E4]">
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function FeaturedMarker() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72">
      <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
      Featured
    </span>
  );
}

function CardLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block no-underline">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="block no-underline">
      {children}
    </Link>
  );
}

function getCtaLabel(type: FeedItemType): string {
  if (type === "job") return "View & Apply";
  if (type === "program") return "Learn More";
  if (type === "event") return "View Details";
  return "Apply Now";
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <CardLink href={item.href}>
      <article className="rounded-[24px] border border-white/8 bg-[#111111] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#14B8A6]/25 md:p-5">
        <div className="flex items-start gap-3">
          <OrgAvatar logo={item.orgLogo} name={item.orgName || "IOPPS"} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={item.type} />
              {item.featured && <FeaturedMarker />}
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-white/72">
              {item.orgName || "IOPPS"}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-white">
              {item.title}
            </h3>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/62">
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.detail && <span>{item.detail}</span>}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {item.badge && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/74">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-[#99F6E4]">
            {getCtaLabel(item.type)} &#8594;
          </span>
        </div>
      </article>
    </CardLink>
  );
}

function FeaturedOpportunityCard({ item }: { item: FeedItem }) {
  return (
    <CardLink href={item.href}>
      <article
        className="h-full rounded-[24px] p-5 transition-transform duration-200 hover:-translate-y-0.5"
        style={{
          border: "1px solid rgba(20,184,166,.22)",
          background: "linear-gradient(145deg, rgba(13,148,136,.14) 0%, rgba(17,17,17,1) 46%, rgba(10,10,10,1) 100%)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TypeBadge type={item.type} />
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/76">
            Featured Opportunity
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <OrgAvatar logo={item.orgLogo} name={item.orgName || "IOPPS"} size={48} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white/76">
              {item.orgName || "IOPPS"}
            </p>
            {item.badge && (
              <p className="truncate text-sm text-[#CCFBF1]">
                {item.badge}
              </p>
            )}
          </div>
        </div>

        <h3 className="mt-4 text-xl font-semibold leading-snug text-white">
          {item.title}
        </h3>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/68">
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.detail && <span>{item.detail}</span>}
        </div>

        <div className="mt-5 flex items-center justify-end">
          <span className="text-sm font-semibold text-[#99F6E4]">
            {getCtaLabel(item.type)} &#8594;
          </span>
        </div>
      </article>
    </CardLink>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[24px] border border-white/8 bg-[#111111] p-5">
      <div className="mb-4 flex gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/6" />
        <div className="flex-1">
          <div className="mb-2 h-3 w-28 rounded bg-white/8" />
          <div className="h-5 w-3/4 rounded bg-white/10" />
        </div>
      </div>
      <div className="mb-3 h-4 w-5/6 rounded bg-white/8" />
      <div className="h-3 w-2/3 rounded bg-white/6" />
    </div>
  );
}

export default function FeedPage() {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [jobs, programs, events, scholarships] = await Promise.all([
          fetchJobs(),
          fetchPrograms(),
          fetchEvents(),
          fetchScholarships(),
        ]);

        const merged = sortByRecencyWithFeaturedBoost(
          [...jobs, ...programs, ...events, ...scholarships],
          {
            recencyKeys: ["createdAt"],
            featuredKeys: ["featuredAt", "updatedAt", "createdAt"],
            boostMs: 18 * 60 * 60 * 1000,
          },
        );

        setAllItems(merged);
      } catch (err) {
        console.error("Feed load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const featuredItems = useMemo(() => (
    selectFeaturedOpportunityItems(allItems, {
      maxItems: 4,
      getOrgKey: (item) => item.orgSlug || item.orgName || item.id,
      getTypeKey: (item) => item.type,
      recencyKeys: ["createdAt"],
      featuredKeys: ["featuredAt", "updatedAt", "createdAt"],
    })
  ), [allItems]);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <section
          className="border-b border-white/8 px-5 py-8"
          style={{ background: "linear-gradient(135deg, #0D9488 0%, #0A0A0A 100%)" }}
        >
          <div className="mx-auto max-w-[860px]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CCFBF1]">
              Empowering Indigenous Success
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Opportunities Feed
            </h1>
            <p className="mt-2 max-w-[620px] text-base text-white/78">
              Jobs, programs, events, and scholarships in one stream. Use the main site navigation to jump into dedicated category boards when you want to browse one area at a time.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[860px] px-4 py-5 md:px-5 md:py-6" data-tour-step="feed">
          {!loading && featuredItems.length > 0 && (
            <section className="mb-6 rounded-[28px] border border-white/8 bg-[#111111] p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99F6E4]">
                    Featured Opportunities
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    A curated mix from across the platform
                  </h2>
                  <p className="mt-1 max-w-[560px] text-sm text-white/66">
                    Up to four featured picks, with organization and opportunity-type variety first.
                  </p>
                </div>
                <p className="text-sm text-white/56">
                  The main feed below still follows freshness first.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {featuredItems.map((item) => (
                  <FeaturedOpportunityCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          )}

          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Latest across IOPPS
              </h2>
              <p className="text-sm text-white/60">
                Featured items get a light boost, but fresh opportunities still lead the stream.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="rounded-[24px] border border-white/8 bg-[#111111] px-6 py-16 text-center">
              <p className="mb-3 text-4xl">🌐</p>
              <h3 className="text-lg font-semibold text-white">
                No opportunities yet
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Check back soon. New public opportunities are added regularly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allItems.map((item) => (
                <FeedCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
