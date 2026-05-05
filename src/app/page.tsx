import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import LandingMobileMenu from "@/components/landing/LandingMobileMenu";
import LandingLivePreview from "@/components/landing/LandingLivePreview";
import { getLandingInlineNavItems } from "@/lib/navigation";
import {
  getLandingContent,
  type LandingEvent,
  type LandingJob,
  type LandingPartner,
  type LandingStats,
} from "@/lib/server/landing-content";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: "IOPPS | Jobs, Events, Livestreams, and Community Opportunities",
  },
  description:
    "Find jobs, events, livestreams, schools, businesses, and community opportunities in one trusted place.",
  openGraph: {
    title: "IOPPS | Jobs, Events, Livestreams, and Community Opportunities",
    description:
      "Watch live coverage, discover upcoming events, explore current roles, and meet trusted partner organizations.",
    url: "https://www.iopps.ca",
    siteName: "IOPPS.CA",
    type: "website",
    images: [
      {
        url: "https://www.iopps.ca/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "IOPPS.CA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IOPPS | Jobs, Events, Livestreams, and Community Opportunities",
    description:
      "Watch live coverage, discover upcoming events, explore current roles, and meet trusted partner organizations.",
    images: ["https://www.iopps.ca/og-image.jpg"],
  },
};

const landingNavItems = getLandingInlineNavItems();

const logoTealTheme = {
  "--teal": "#18D3C2",
  "--teal-light": "#45F0E1",
  "--teal-soft": "color-mix(in srgb, #18D3C2 18%, var(--card))",
  "--accent": "#18D3C2",
  "--input-focus": "#18D3C2",
} as CSSProperties;

const panelStyle: CSSProperties = {
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.14)",
  boxShadow: "0 28px 70px -46px rgba(0,0,0,.72)",
  backdropFilter: "blur(18px)",
};

const softPanelStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--card) 88%, var(--bg))",
  border: "1px solid color-mix(in srgb, var(--text-muted) 18%, var(--border))",
};

const fallbackPartners: LandingPartner[] = [
  {
    id: "education-partners",
    name: "Education Partners",
    shortName: "Education",
    tier: "school",
    label: "Education Partner",
    location: "Canada",
    focus: "Schools and training providers can share programs, events, and pathways with the IOPPS community.",
    href: "/partners",
  },
  {
    id: "community-organizations",
    name: "Community Organizations",
    shortName: "Community",
    tier: "premium",
    label: "Premium Partner",
    location: "Canada",
    focus: "Community organizations can highlight services, hiring, gatherings, and live coverage.",
    href: "/partners",
  },
  {
    id: "hiring-partners",
    name: "Hiring Partners",
    shortName: "Hiring",
    tier: "standard",
    label: "Partner",
    location: "Canada",
    focus: "Employers and businesses can reach people looking for current roles and trusted opportunities.",
    href: "/partners",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "IOPPS",
      url: "https://www.iopps.ca",
      description: "Jobs, events, livestreams, schools, businesses, and community opportunities in one place.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.iopps.ca/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: "IOPPS",
      url: "https://www.iopps.ca",
      logo: "https://www.iopps.ca/logo.png",
      description:
        "IOPPS connects people with jobs, events, livestreams, schools, businesses, partners, and community opportunities.",
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://www.iopps.ca/contact",
      },
    },
  ],
};

function Header() {
  return (
    <header className="relative z-10 mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-6 lg:px-8">
      <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 no-underline sm:gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] sm:h-12 sm:w-12">
          <Image src="/logo.png" alt="IOPPS" width={38} height={38} priority className="h-8 w-8 sm:h-[38px] sm:w-[38px]" />
        </span>
        <span className="leading-none">
          <span className="block text-[1.18rem] font-black tracking-[0.16em] text-white sm:text-[1.55rem] sm:tracking-[0.18em]">
            IOPPS
          </span>
        </span>
      </Link>

      <nav className="hidden min-w-0 flex-1 justify-center gap-1 lg:flex">
        {landingNavItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="rounded-[14px] px-3 py-2 text-sm font-semibold text-white/76 no-underline transition-colors hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LandingMobileMenu />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <Link href="/login" className="hidden no-underline min-[420px]:block">
          <Button
            variant="outline"
            size="sm"
            className="min-h-9 rounded-xl border-white/18 px-3 text-xs text-white sm:min-h-10 sm:px-4 sm:text-sm"
            style={{ background: "rgba(255,255,255,.08)", color: "#FFFFFF" }}
          >
            Sign In
          </Button>
        </Link>
        <Link href="/signup" className="hidden no-underline min-[420px]:block">
          <Button variant="primary-teal" size="sm" className="min-h-9 rounded-xl px-3 text-xs sm:min-h-10 sm:px-4 sm:text-sm">
            Sign Up
          </Button>
        </Link>
      </div>
    </header>
  );
}

function formatStat(value: number, fallback: string): string {
  return value > 0 ? value.toLocaleString("en-CA") : fallback;
}

function FirstScreenActivityLinks({ stats }: { stats: LandingStats }) {
  const items = [
    { label: "Live", value: "Watch now", detail: "Coverage and replays", href: "/livestreams" },
    { label: "Jobs", value: `${formatStat(stats.jobs, "New")} roles`, detail: "Current openings", href: "/jobs" },
    { label: "Events", value: `${formatStat(stats.events, "New")} events`, detail: "Career and community", href: "/events" },
  ];

  return (
    <div className="mt-5 grid max-w-[680px] grid-cols-3 gap-2 sm:gap-3">
      {items.map((item) => (
        <Link key={item.label} href={item.href} className="min-w-0 no-underline">
          <div className="h-full rounded-[16px] border border-white/12 bg-white/[0.075] px-3 py-3 text-white transition-colors hover:bg-white/12">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-teal-light">{item.label}</p>
            <p className="mt-1 text-[13px] font-black leading-snug text-white sm:text-sm">{item.value}</p>
            <p className="mt-1 hidden text-[11px] font-semibold leading-4 text-white/62 sm:block">{item.detail}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TrustedPartnerStrip({ partners }: { partners: LandingPartner[] }) {
  const visiblePartners = partners.length ? partners : fallbackPartners;

  return (
    <div className="mt-5 max-w-[680px] rounded-[20px] border border-white/12 bg-white/[0.07] p-3 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[11px] font-black uppercase tracking-[0.2em] text-white/62">Trusted partners</p>
        <Link href="/partners" className="text-sm font-bold text-teal-light no-underline">
          View partners &rarr;
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {visiblePartners.slice(0, 4).map((partner) => (
          <Link
            key={partner.id}
            href={partner.href}
            className="flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.075] px-3 py-2 text-white no-underline"
          >
            <Avatar name={partner.shortName} src={partner.logoUrl} size={28} />
            <span className="max-w-[142px] truncate text-xs font-bold text-white/86">{partner.shortName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatStrip({ stats }: { stats: LandingStats }) {
  const items = [
    { label: "Active roles", value: formatStat(stats.jobs, "New"), href: "/jobs" },
    { label: "Upcoming events", value: formatStat(stats.events, "New"), href: "/events" },
    { label: "Partners", value: formatStat(stats.partners, "Open"), href: "/partners" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((stat) => (
        <Link key={stat.label} href={stat.href} className="no-underline">
          <div className="rounded-[20px] px-4 py-4 text-white transition-transform hover:-translate-y-0.5" style={panelStyle}>
            <p className="m-0 text-[28px] font-black leading-none">{stat.value}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/62">{stat.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function JobTile({ job, emphasis = false }: { job: LandingJob; emphasis?: boolean }) {
  return (
    <Link href={job.href} className="block h-full no-underline">
      <article
        className="flex h-full flex-col rounded-[22px] p-4 transition-transform hover:-translate-y-0.5"
        style={{
          ...softPanelStyle,
          ...(job.featured ? { borderColor: "color-mix(in srgb, var(--teal) 34%, var(--border))" } : {}),
        }}
      >
        <div className="flex items-start gap-3">
          <Avatar name={job.employer} size={emphasis ? 48 : 40} />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-bold text-teal">{job.employer}</p>
            <h3 className="mt-1 text-base font-bold leading-snug text-text">{job.title}</h3>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-sec">
          <span>{job.location}</span>
          <span>{job.type}</span>
          <span className="font-bold text-text">{job.salary}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {job.badge ? <Badge text={job.badge} color="var(--gold)" bg="var(--gold-soft)" small /> : <span />}
          <span className="text-sm font-bold text-teal">View role &rarr;</span>
        </div>
      </article>
    </Link>
  );
}

function EmptyOpportunityTile({ type }: { type: "job" | "event" }) {
  const href = type === "job" ? "/jobs" : "/events";
  const title = type === "job" ? "New roles are being updated" : "Upcoming events are being updated";
  const body =
    type === "job"
      ? "Browse the jobs page for the newest roles as organizations publish them."
      : "Browse the events page for new gatherings, training sessions, and community dates.";

  return (
    <Link href={href} className="block h-full no-underline">
      <article className="flex h-full flex-col rounded-[22px] border border-dashed border-border bg-card p-4">
        <h3 className="text-base font-black text-text">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-text-sec">{body}</p>
        <span className="mt-auto pt-4 text-sm font-bold text-teal">Browse {type === "job" ? "jobs" : "events"} &rarr;</span>
      </article>
    </Link>
  );
}

function eventDateParts(date: string) {
  const match = date.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
  return {
    month: match?.[1]?.slice(0, 3).toUpperCase() || "DATE",
    day: match?.[2] || "",
  };
}

function EventTile({ event, emphasis = false }: { event: LandingEvent; emphasis?: boolean }) {
  const { month, day } = eventDateParts(event.date);

  return (
    <Link href={event.href} className="block h-full no-underline">
      <article className="flex h-full flex-col rounded-[22px] p-4 transition-transform hover:-translate-y-0.5" style={softPanelStyle}>
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 rounded-2xl px-3 py-2 text-center"
            style={{ background: "color-mix(in srgb, var(--teal-soft) 72%, var(--card))" }}
          >
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-teal">{month}</p>
            {day ? <p className="m-0 text-xl font-black leading-none text-teal">{day}</p> : null}
          </div>
          <div className="min-w-0">
            <Badge text={event.kind} color="var(--teal)" small />
            <h3 className={`mt-2 font-bold leading-snug text-text ${emphasis ? "text-lg" : "text-base"}`}>{event.title}</h3>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-text-sec">
          <p className="m-0">{event.host}</p>
          <p className="m-0">{event.location}</p>
        </div>
        <span className="mt-auto pt-4 text-sm font-bold text-teal">View event &rarr;</span>
      </article>
    </Link>
  );
}

function PartnerBadgeStyle(partner: LandingPartner): { color: string; bg: string } {
  if (partner.tier === "premium") return { color: "var(--gold)", bg: "var(--gold-soft)" };
  if (partner.tier === "school") return { color: "var(--blue)", bg: "var(--blue-soft)" };
  return { color: "var(--teal)", bg: "var(--teal-soft)" };
}

function PartnerFeatureCard({ partner, featured = false }: { partner: LandingPartner; featured?: boolean }) {
  const badge = PartnerBadgeStyle(partner);

  return (
    <Link href={partner.href} className="block h-full no-underline">
      <Card
        variant={featured ? "spotlight" : "list"}
        className="h-full hover:-translate-y-0.5 hover:shadow-md"
        style={featured ? { borderColor: "color-mix(in srgb, var(--gold) 34%, var(--border))" } : undefined}
      >
        <article className="flex h-full flex-col p-5">
          <div className="flex items-start gap-3">
            <Avatar name={partner.shortName} src={partner.logoUrl} size={featured ? 54 : 46} />
            <div className="min-w-0 flex-1">
              <Badge text={partner.label} color={badge.color} bg={badge.bg} small />
              <h3 className="mt-3 text-lg font-black leading-tight text-text">{partner.name}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{partner.location}</p>
            </div>
          </div>
          <p className="mt-4 line-clamp-4 text-sm leading-7 text-text-sec">{partner.focus}</p>
          <span className="mt-auto pt-5 text-sm font-bold text-teal">View partner &rarr;</span>
        </article>
      </Card>
    </Link>
  );
}

function PartnerShowcase({ partners }: { partners: LandingPartner[] }) {
  const visiblePartners = partners.length ? partners : fallbackPartners;
  const [featured, ...supporting] = visiblePartners;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1.4fr]">
      <PartnerFeatureCard partner={featured} featured />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
        {supporting.slice(0, 3).map((partner) => (
          <PartnerFeatureCard key={partner.id} partner={partner} />
        ))}
      </div>
    </div>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-teal">{eyebrow}</p>
          <h2 className="mt-2 text-[26px] font-black leading-tight text-text sm:text-[32px]">{title}</h2>
          <p className="mt-2 max-w-[720px] text-sm leading-6 text-text-sec">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function PathwayCards() {
  const pathways = [
    {
      title: "For job seekers",
      body: "Browse roles, save opportunities, and follow employers already reaching community talent.",
      href: "/jobs",
      action: "Find jobs",
    },
    {
      title: "For event goers",
      body: "Find career fairs, gatherings, training sessions, and community events in one trusted place.",
      href: "/events",
      action: "See events",
    },
    {
      title: "For community viewers",
      body: "Watch live coverage and replays from IOPPS streams, interviews, and partner productions.",
      href: "/livestreams",
      action: "Watch live",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {pathways.map((pathway) => (
        <Link key={pathway.title} href={pathway.href} className="no-underline">
          <Card variant="list" className="h-full hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-full flex-col p-5">
              <h3 className="text-xl font-black text-text">{pathway.title}</h3>
              <p className="mt-3 text-sm leading-7 text-text-sec">{pathway.body}</p>
              <span className="mt-auto pt-5 text-sm font-bold text-teal">{pathway.action} &rarr;</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function JobsEventsGrid({ jobs, events }: { jobs: LandingJob[]; events: LandingEvent[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black text-text">Current jobs</h3>
          <Link href="/jobs" className="text-sm font-bold text-teal no-underline">
            Browse jobs &rarr;
          </Link>
        </div>
        <div className="grid gap-3">
          {jobs.length ? jobs.map((job) => <JobTile key={job.id} job={job} />) : <EmptyOpportunityTile type="job" />}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black text-text">Upcoming events</h3>
          <Link href="/events" className="text-sm font-bold text-teal no-underline">
            Browse events &rarr;
          </Link>
        </div>
        <div className="grid gap-3">
          {events.length ? events.map((event) => <EventTile key={event.id} event={event} />) : <EmptyOpportunityTile type="event" />}
        </div>
      </div>
    </div>
  );
}

function EmptyStatePreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <Card>
        <div className="p-6">
          <p className="m-0 text-xs font-black uppercase tracking-[0.22em] text-teal">Livestreams</p>
          <h3 className="mt-3 text-2xl font-black text-text">Catch up on live coverage and replays.</h3>
          <p className="mt-3 text-sm leading-7 text-text-sec">
            Watch recent coverage, see what is coming next, and move from a replay into related events, jobs, and community updates.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/livestreams" className="no-underline">
              <Button variant="primary-teal">View replays</Button>
            </Link>
            <Link href="/events" className="no-underline">
              <Button variant="outline">Find events</Button>
            </Link>
          </div>
        </div>
      </Card>
      <Card variant="spotlight">
        <div className="p-6">
          <p className="m-0 text-xs font-black uppercase tracking-[0.22em] text-teal">Partners</p>
          <h3 className="mt-3 text-2xl font-black text-text">Find trusted organizations on IOPPS.</h3>
          <p className="mt-3 text-sm leading-7 text-text-sec">
            Meet the partners, schools, businesses, and community organizations sharing opportunities, hosting events, and supporting the network.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Hero({ stats, partners, jobs, events }: { stats: LandingStats; partners: LandingPartner[]; jobs: LandingJob[]; events: LandingEvent[] }) {
  return (
    <div className="relative overflow-hidden text-white">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(145deg, var(--navy-deep) 0%, var(--navy) 48%, var(--teal) 100%)",
        }}
      />

      <Header />

      <div className="relative mx-auto grid max-w-[1320px] gap-8 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:px-8 lg:pb-14">
        <div className="flex flex-col justify-center">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.28em] text-teal-light">Empowering Indigenous Success</p>
          <h1 className="mt-4 max-w-[780px] text-[36px] font-black leading-tight sm:text-[48px] lg:text-[58px]">
            Find jobs, events, livestreams, and community opportunities in one place.
          </h1>
          <p className="mt-4 max-w-[660px] text-base leading-7 text-white/78 sm:text-lg">
            Start with what you need today. Watch live coverage, discover upcoming events, and explore current roles from trusted organizations.
          </p>
          <FirstScreenActivityLinks stats={stats} />
          <TrustedPartnerStrip partners={partners} />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/jobs" className="no-underline">
              <Button variant="primary-teal" size="lg">
                Explore Opportunities
              </Button>
            </Link>
            <Link href="/livestreams" className="no-underline">
              <Button
                variant="outline"
                size="lg"
                className="border-white/18 text-white"
                style={{ background: "rgba(255,255,255,.07)", color: "#FFFFFF" }}
              >
                Watch Live
              </Button>
            </Link>
          </div>
          <div className="mt-8">
            <StatStrip stats={stats} />
          </div>
        </div>

        <div className="grid gap-4">
          <LandingLivePreview />
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs[0] ? <JobTile job={jobs[0]} emphasis /> : <EmptyOpportunityTile type="job" />}
            {events[0] ? <EventTile event={events[0]} emphasis /> : <EmptyOpportunityTile type="event" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const content = await getLandingContent();

  return (
    <div className="min-h-screen bg-bg" style={logoTealTheme}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Hero stats={content.stats} partners={content.partners} jobs={content.jobs} events={content.events} />

      <main>
        <SectionShell
          eyebrow="Partner network"
          title="Meet the organizations building opportunity with IOPPS"
          description="Showcase education partners, community organizations, employers, and businesses that are already creating trusted paths into jobs, events, livestreams, and programs."
          action={
            <Link href="/partners" className="no-underline">
              <Button variant="primary-teal">View Partners</Button>
            </Link>
          }
        >
          <PartnerShowcase partners={content.partners} />
        </SectionShell>

        <SectionShell
          eyebrow="Start here"
          title="Start with what is active now"
          description="Choose the path that fits today: current jobs, upcoming events, live coverage, schools, businesses, and trusted partners."
          action={
            <Link href="/signup" className="no-underline">
              <Button variant="primary-teal">Sign Up</Button>
            </Link>
          }
        >
          <PathwayCards />
        </SectionShell>

        <SectionShell
          eyebrow="Live opportunities"
          title="Current jobs and upcoming events stay easy to reach"
          description="People can move from the homepage into active roles, community gatherings, and live coverage without sorting through a long introduction."
        >
          <JobsEventsGrid jobs={content.jobs} events={content.events} />
        </SectionShell>

        <SectionShell
          eyebrow="Stay connected"
          title="There is always something useful to explore"
          description="Watch a replay, find the next event, browse current jobs, or discover the organizations active across IOPPS."
        >
          <EmptyStatePreview />
        </SectionShell>
      </main>

      <Footer />
    </div>
  );
}
