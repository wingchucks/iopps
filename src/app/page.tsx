import Link from "next/link";
import Image from "next/image";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";
import SectionHeader from "@/components/surfaces/SectionHeader";
import SpotlightCard from "@/components/surfaces/SpotlightCard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLandingInlineNavItems } from "@/lib/navigation";
import { getPublicSchoolRecords } from "@/lib/server/public-schools";
import { displayLocation } from "@/lib/utils";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";

async function getStats() {
  try {
    const adminDb = getAdminDb();
    const [usersSnap, jobsSnap, employersSnap, eventsSnap, schools] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("jobs").where("status", "==", "active").count().get(),
      adminDb.collection("employers").where("status", "==", "approved").count().get(),
      adminDb.collection("events").count().get(),
      getPublicSchoolRecords(adminDb),
    ]);
    return {
      members: usersSnap.data().count,
      jobs: jobsSnap.data().count,
      organizations: employersSnap.data().count,
      events: eventsSnap.data().count,
      schools: schools.length,
    };
  } catch {
    return { members: 0, jobs: 0, organizations: 0, events: 0, schools: 0 };
  }
}

interface PartnerData {
  name: string;
  shortName: string;
  tier: string;
  partnerLabel?: string;
  logoUrl?: string;
  location?: unknown;
}

async function getPartners(): Promise<PartnerData[]> {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection("organizations").get();

    return snap.docs
      .map((doc) => withPartnerPromotion({ id: doc.id, ...doc.data() } as Record<string, unknown>))
      .filter((org) => isPaidPartner(org) && (org.logoUrl || org.logo))
      .sort(comparePartnerPromotion)
      .map((org) => ({
        name: String(org.name || ""),
        shortName: String(org.shortName || org.name || ""),
        tier: String(org.partnerTier || org.tier || "standard"),
        partnerLabel: String(org.partnerBadgeLabel || org.partnerLabel || "Partner"),
        logoUrl: String(org.logoUrl || org.logo || ""),
        location: org.location,
      }));
  } catch {
    return [];
  }
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "IOPPS",
      url: "https://www.iopps.ca",
      description: "Canada's Indigenous professional platform",
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
        "Canada's Indigenous professional platform. Jobs, events, scholarships, businesses, schools, and livestreams for Indigenous communities across North America.",
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://www.iopps.ca/contact",
      },
    },
  ],
};

const landingNavItems = getLandingInlineNavItems();

export default async function LandingPage() {
  const [stats, partners] = await Promise.all([getStats(), getPartners()]);
  const partnerProof = partners.slice(0, 4);
  const featuredPartner = partners[0];

  const primaryCards = [
    {
      key: "jobs",
      title: "Jobs",
      value: `${stats.jobs || 0} active roles`,
      description: "Find Indigenous and allied employers hiring across Canada.",
      href: "/jobs",
      action: "Explore jobs",
    },
    {
      key: "events",
      title: "Events",
      value: `${stats.events || 0} live listings`,
      description: "Career fairs, pow wows, gatherings, and community events.",
      href: "/events",
      action: "See events",
    },
    {
      key: "schools",
      title: "Schools",
      value: stats.schools > 0 ? `${stats.schools} institutions` : "Education updates",
      description: "Explore schools, training partners, and education pathways.",
      href: "/schools",
      action: "Browse schools",
    },
    {
      key: "businesses",
      title: "Businesses",
      value: `${stats.organizations || 0} organizations`,
      description: "Browse businesses, employers, and partner organizations on IOPPS.",
      href: "/businesses",
      action: "Explore businesses",
    },
  ];

  const whyPoints = [
    "Indigenous-centered opportunities, organizations, and community updates in one place.",
    "Real partner proof and public discovery paths that work on mobile first.",
    "A cleaner path from first visit to jobs, events, schools, and business discovery.",
  ];

  return (
    <div className="min-h-screen bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section
        className="relative overflow-hidden border-b border-white/10 text-white"
        style={{
          background: "linear-gradient(145deg, var(--navy-deep) 0%, var(--navy) 46%, var(--teal) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full"
          style={{ background: "rgba(255,255,255,.08)", filter: "blur(10px)" }}
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full"
          style={{ background: "rgba(13,148,136,.22)", filter: "blur(14px)" }}
        />

        <div className="relative mx-auto max-w-[1400px] px-4 pb-14 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-3 no-underline">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] shadow-[0_16px_34px_-24px_rgba(0,0,0,.48)]">
                <Image src="/logo.png" alt="IOPPS" width={38} height={38} priority />
              </div>
              <div className="min-w-0 leading-none">
                <p className="m-0 text-[1.55rem] font-black tracking-[0.18em] text-white sm:text-[1.7rem]">IOPPS</p>
                <p className="m-0 mt-1 hidden whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.26em] text-teal-light xl:block">
                  Empowering Indigenous Success
                </p>
              </div>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex">
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
                {landingNavItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="shrink-0 whitespace-nowrap rounded-[14px] px-3.5 py-2.5 text-[15px] font-semibold no-underline transition-all duration-200 hover:bg-white/8"
                    style={{ color: "rgba(255,255,255,.78)" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div
                className="flex shrink-0 items-center gap-2 rounded-[18px] border border-white/10 px-2 py-2"
                style={{
                  background: "rgba(255,255,255,.045)",
                  boxShadow: "0 18px 34px -28px rgba(0,0,0,.4)",
                }}
              >
                <ThemeToggle />
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="min-w-[118px] border-white/18 text-white"
                    style={{ background: "rgba(255,255,255,.08)", color: "#FFFFFF" }}
                  >
                    <span className="whitespace-nowrap">Sign In</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary-teal" className="min-w-[120px]">
                    <span className="whitespace-nowrap">Join Free</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <MobileMenu />
            </div>
          </div>

          <div className="mt-14 max-w-[760px]">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.28em] text-teal-light">
              EMPOWERING INDIGENOUS SUCCESS
            </p>
            <h1 className="mt-4 text-[34px] font-extrabold leading-tight text-white sm:text-[44px] md:text-[54px]">
              Find Indigenous jobs, events, schools, and businesses in one trusted platform.
            </h1>
            <p className="mt-4 max-w-[640px] text-base leading-7 text-white/78 sm:text-lg">
              Discover opportunities, community updates, and partner organizations built for Indigenous success across Canada.
            </p>

            <div className="mt-6 lg:hidden">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="block sm:flex-1">
                  <Button full variant="primary-teal" size="lg">
                    Sign Up Free
                  </Button>
                </Link>
                <Link href="/login" className="block sm:flex-1">
                  <Button
                    full
                    variant="outline"
                    size="lg"
                    className="border-white/18 text-white"
                    style={{ background: "rgba(255,255,255,.05)" }}
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
              <Link
                href="/jobs"
                className="mt-3 inline-flex items-center text-sm font-semibold text-white/82 no-underline transition-colors hover:text-white"
              >
                Explore Jobs &rarr;
              </Link>
            </div>

            <div className="mt-6 hidden lg:flex lg:flex-row lg:gap-3">
              <Link href="/signup">
                <Button variant="primary-teal" size="lg">
                  Join Free
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/18 text-white"
                  style={{ background: "rgba(255,255,255,.05)" }}
                >
                  Explore Jobs
                </Button>
              </Link>
            </div>

            <div
              className="mt-6 rounded-[24px] border px-4 py-4 sm:px-5"
              style={{
                background: "rgba(9,30,54,.42)",
                borderColor: "rgba(255,255,255,.12)",
                backdropFilter: "blur(18px)",
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-white/58">
                    Trusted by partners
                  </p>
                  <p className="mt-1 text-sm text-white/76">
                    Organizations already using IOPPS to reach Indigenous communities and talent.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {partnerProof.map((partner) => (
                    <div key={partner.name} className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-2">
                      <Avatar name={partner.shortName} src={partner.logoUrl} size={28} />
                      <span className="text-xs font-semibold text-white/84">{partner.shortName}</span>
                    </div>
                  ))}
                  <Link href="/partners" className="text-sm font-semibold text-teal-light no-underline">
                    View partners &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <SectionHeader
            eyebrow="Start here"
            title="Move directly into the part of IOPPS that matters most"
            description="The homepage now leads with four clear entry points instead of a crowded stack of similar sections."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {primaryCards.map((item) => (
              <Link key={item.key} href={item.href} className="no-underline">
                <Card variant="list" className="h-full hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-full flex-col gap-4 p-5">
                    <div>
                      <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-teal">{item.value}</p>
                      <h2 className="mt-3 text-[24px] font-bold leading-tight text-text">{item.title}</h2>
                    </div>
                    <p className="text-sm leading-7 text-text-sec">{item.description}</p>
                    <span className="mt-auto text-sm font-semibold text-teal">{item.action} &rarr;</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Featured this week"
            title={featuredPartner ? "Partner visibility that feels real" : "A cleaner path into live opportunities"}
            description={
              featuredPartner
                ? "Keep one stronger spotlight block under the main entry points instead of multiple oversized promo sections."
                : "The homepage keeps one focused spotlight instead of stacking multiple competing modules."
            }
          />

          <div className="mt-5">
            <SpotlightCard
              eyebrow="Featured this week"
              overline={featuredPartner ? featuredPartner.name : "IOPPS Opportunity Board"}
              avatarName={featuredPartner ? featuredPartner.shortName : "IOPPS"}
              avatarSrc={featuredPartner?.logoUrl}
              title={
                featuredPartner
                  ? `${featuredPartner.name} is active on IOPPS`
                  : `${stats.jobs || 0} active roles are live right now`
              }
              description={
                featuredPartner
                  ? "Explore partner organizations, employers, and community-facing businesses that are already building trust and visibility on the platform."
                  : "Browse fresh roles, current events, and platform discovery paths built for mobile users first."
              }
              meta={[
                featuredPartner?.partnerLabel || "Partner visibility",
                featuredPartner ? displayLocation(featuredPartner.location) || "Canada" : `${stats.events || 0} public events`,
                `${stats.organizations || 0} organizations on IOPPS`,
              ].filter(Boolean)}
              primaryAction={{
                label: featuredPartner ? "Explore Partners" : "Explore Jobs",
                href: featuredPartner ? "/partners" : "/jobs",
              }}
              secondaryAction={{
                label: featuredPartner ? "Browse Businesses" : "Join Free",
                href: featuredPartner ? "/businesses" : "/signup",
                variant: "outline",
              }}
            />
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_.95fr]">
          <Card variant="list">
            <div className="p-5 sm:p-6">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-teal">Why IOPPS works</p>
              <h2 className="mt-3 text-[24px] font-bold text-text">The platform should feel useful before it asks for commitment.</h2>
              <div className="mt-5 space-y-4">
                {whyPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-teal" />
                    <p className="m-0 text-sm leading-7 text-text-sec">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card variant="spotlight">
            <div className="p-5 sm:p-6">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-teal">Ready to join?</p>
              <h2 className="mt-3 text-[24px] font-bold text-text">Start with the part of IOPPS that matches your goal.</h2>
              <p className="mt-3 text-sm leading-7 text-text-sec">
                Join the community, browse jobs, or explore employers and education partners without fighting the interface first.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/signup">
                  <Button full variant="primary-teal">
                    Join Free
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button full variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
