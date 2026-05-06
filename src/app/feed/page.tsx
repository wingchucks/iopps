"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import {
  selectFeaturedOpportunityItems,
  sortByRecencyWithFeaturedBoost,
} from "@/lib/public-featured";
import { displayAmount, displayLocation } from "@/lib/utils";

type FeedItemType = "job" | "program" | "event" | "scholarship" | "school";

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
  school: { label: "Schools", icon: "🏫" },
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
    subtitle: [displayLocation(job.location), displayLocation(job.workLocation)].filter(Boolean).join(" · "),
    detail: displayAmount(job.salary),
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
    subtitle: [displayLocation(program.location), String(program.format || "")].filter(Boolean).join(" · "),
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
    subtitle: [displayLocation(event.location), String(event.city || "")].filter(Boolean).join(", "),
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
      detail: displayAmount(scholarship.amount) || displayAmount(scholarship.value),
      badge: (scholarship.category as string) || (scholarship.type as string) || "",
      href: (scholarship.applicationUrl as string) || (scholarship.url as string) || "/scholarships",
      createdAt: (scholarship.createdAt as string) || "",
      featured: Boolean(scholarship.featured),
    }));
}

async function fetchSchools(): Promise<FeedItem[]> {
  const res = await fetch("/api/schools");
  if (!res.ok) return [];
  const data = await res.json();
  const schools = Array.isArray(data) ? data : (data.schools || []);
  return schools.map((school: Record<string, unknown>) => {
    const programCount = Number(school.programCount || 0);
    const scholarshipCount = Number(school.scholarshipCount || 0);
    const detail = [
      programCount > 0 ? `${programCount} programs` : "",
      scholarshipCount > 0 ? `${scholarshipCount} scholarships` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: String(school.id || school.slug || ""),
      type: "school" as FeedItemType,
      title: String(school.name || ""),
      orgName: String(school.institutionType || "School"),
      orgLogo: (school.logoUrl as string) || (school.logo as string) || "",
      orgSlug: (school.slug as string) || (school.id as string) || "",
      subtitle: displayLocation(school.location) || String(school.tagline || ""),
      detail,
      badge: (school.partnerBadgeLabel as string) || (school.partnerLabel as string) || String(school.type || "School"),
      href: `/schools/${school.slug || school.id || ""}`,
      createdAt: (school.updatedAt as string) || (school.createdAt as string) || "",
      featured: Boolean(school.isPartner || school.featured),
    };
  });
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
          background: "var(--bg)",
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
        background: "linear-gradient(135deg, var(--teal), var(--navy))",
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
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "color-mix(in srgb, var(--teal) 25%, var(--border))", background: "var(--teal-soft)", color: "var(--teal)" }}>
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function FeaturedMarker() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
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
  if (type === "school") return "View School";
  return "Apply Now";
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <CardLink href={item.href}>
      <Card variant="list" className="p-4 hover:-translate-y-0.5 md:p-5">
        <div className="flex items-start gap-3">
          <OrgAvatar logo={item.orgLogo} name={item.orgName || "IOPPS"} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={item.type} />
              {item.featured && <FeaturedMarker />}
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-text-sec">
              {item.orgName || "IOPPS"}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-text">
              {item.title}
            </h3>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-sec">
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.detail && <span>{item.detail}</span>}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {item.badge && (
              <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold text-text-sec">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-teal">
            {getCtaLabel(item.type)} &#8594;
          </span>
        </div>
      </Card>
    </CardLink>
  );
}

function FeaturedOpportunityCard({ item }: { item: FeedItem }) {
  return (
    <CardLink href={item.href}>
      <Card variant="spotlight" className="h-full p-5 hover:-translate-y-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TypeBadge type={item.type} />
          <span className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-sec">
            Featured Opportunity
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <OrgAvatar logo={item.orgLogo} name={item.orgName || "IOPPS"} size={48} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-sec">
              {item.orgName || "IOPPS"}
            </p>
            {item.badge && (
              <p className="truncate text-sm text-teal">
                {item.badge}
              </p>
            )}
          </div>
        </div>

        <h3 className="mt-4 text-xl font-semibold leading-snug text-text">
          {item.title}
        </h3>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-sec">
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.detail && <span>{item.detail}</span>}
        </div>

        <div className="mt-5 flex items-center justify-end">
          <span className="text-sm font-semibold text-teal">
            {getCtaLabel(item.type)} &#8594;
          </span>
        </div>
      </Card>
    </CardLink>
  );
}

function SkeletonCard() {
  return (
    <Card variant="list" className="p-5">
      <div className="mb-4 flex gap-3">
        <div className="h-11 w-11 rounded-xl bg-border" />
        <div className="flex-1">
          <div className="mb-2 h-3 w-28 rounded bg-border" />
          <div className="h-5 w-3/4 rounded bg-border" />
        </div>
      </div>
      <div className="mb-3 h-4 w-5/6 rounded bg-border" />
      <div className="h-3 w-2/3 rounded bg-border" />
    </Card>
  );
}

export default function FeedPage() {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [jobs, programs, events, scholarships, schools] = await Promise.all([
          fetchJobs(),
          fetchPrograms(),
          fetchEvents(),
          fetchScholarships(),
          fetchSchools(),
        ]);

        const merged = sortByRecencyWithFeaturedBoost(
          [...jobs, ...programs, ...events, ...scholarships, ...schools],
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

  const quickCards = useMemo(() => {
    const firstByType = (type: FeedItemType) => allItems.find((item) => item.type === type);
    return [
      {
        title: "Jobs near your next step",
        description: firstByType("job")?.title || "Browse active Indigenous and allied employers.",
        href: "/jobs",
        cta: "Browse jobs",
        icon: "💼",
      },
      {
        title: "Events to keep on your radar",
        description: firstByType("event")?.title || "Find pow wows, conferences, and community events.",
        href: "/events",
        cta: "Browse events",
        icon: "📅",
      },
      {
        title: "Build skills and credentials",
        description: firstByType("program")?.title || "Explore training and education pathways.",
        href: "/training",
        cta: "Browse training",
        icon: "📚",
      },
      {
        title: "Pick up where you left off",
        description: "Review saved items, applications, events, and learning from your profile.",
        href: "/profile",
        cta: "Open profile",
        icon: "✨",
      },
    ];
  }, [allItems]);

  return (
    <AppShell>
      <div className="min-h-screen bg-bg text-text">
        <section
          className="border-b border-border px-5 py-8"
          style={{ background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 58%, #0D3B66 100%)" }}
        >
          <div className="mx-auto max-w-[860px]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CCFBF1]">
              Empowering Indigenous Success
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Your Indigenous opportunities, all in one place
            </h1>
            <p className="mt-2 max-w-[620px] text-base text-white/72">
              Jobs, scholarships, events, and training programs from Indigenous-led and allied organizations across Canada — ready when you are.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[860px] px-4 py-5 md:px-5 md:py-6" data-tour-step="feed">
          {!loading && (
            <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {quickCards.map((card) => (
                <Link key={card.href} href={card.href} className="no-underline">
                  <div className="h-full rounded-[22px] border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-border text-xl">{card.icon}</span>
                      <div>
                        <h2 className="text-base font-semibold text-text">{card.title}</h2>
                        <p className="text-xs font-semibold text-teal">{card.cta} &#8594;</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-text-sec">{card.description}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {!loading && featuredItems.length > 0 && (
            <section className="mb-6 rounded-[28px] border border-border bg-card p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
                    Featured Opportunities
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text">
                    Handpicked for Indigenous professionals
                  </h2>
                  <p className="mt-1 max-w-[560px] text-sm text-text-sec">
                    A rotating selection of standout jobs, events, and scholarships worth a closer look.
                  </p>
                </div>
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
              <h2 className="text-2xl font-semibold text-text">
                Fresh opportunities
              </h2>
              <p className="text-sm text-text-sec">
                A mixed stream of fresh jobs, events, training, scholarships, and schools — not just another job board.
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
            <div className="rounded-[24px] border border-border bg-card px-6 py-16 text-center">
              <p className="mb-3 text-4xl">🌐</p>
              <h3 className="text-lg font-semibold text-text">
                No opportunities yet
              </h3>
              <p className="mt-2 text-sm text-text-sec">
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
