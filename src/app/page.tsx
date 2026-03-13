import Link from "next/link";
import Image from "next/image";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";

import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";
import { HeroCTA, BottomCTA, PartnerStripCTA } from "@/components/HomepageCTA";
import { adminDb } from "@/lib/firebase-admin";
import { displayLocation } from "@/lib/utils";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";

async function getStats() {
  if (!adminDb) return { members: 0, jobs: 0, organizations: 0, events: 0, shops: 0 };
  try {
    const [usersSnap, jobsSnap, employersSnap, eventsSnap, shopsSnap] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("jobs").where("status", "==", "active").count().get(),
      adminDb.collection("employers").where("status", "==", "approved").count().get(),
      adminDb.collection("events").count().get(),
      adminDb.collection("shopListings").where("status", "==", "active").count().get(),
    ]);
    return {
      members: usersSnap.data().count,
      jobs: jobsSnap.data().count,
      organizations: employersSnap.data().count,
      events: eventsSnap.data().count,
      shops: shopsSnap.data().count,
    };
  } catch {
    return { members: 0, jobs: 0, organizations: 0, events: 0, shops: 0 };
  }
}

interface PartnerData {
  name: string;
  shortName: string;
  tier: string;
  partnerLabel?: string;
  logoUrl?: string;
  location?: unknown;
  type?: string;
}

async function getPartners(): Promise<PartnerData[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .collection("organizations")
      .get();
    const orgs = snap.docs
      .map((d) => withPartnerPromotion({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((o) => isPaidPartner(o) && (o.logoUrl || o.logo))
      .sort(comparePartnerPromotion)
      .map((o) => ({
        name: String(o.name || ""),
        shortName: String(o.shortName || o.name || ""),
        tier: String(o.partnerTier || o.tier || "standard"),
        partnerLabel: String(o.partnerBadgeLabel || o.partnerLabel || "Partner"),
        logoUrl: String(o.logoUrl || o.logo || ""),
        location: o.location,
        type: String(o.type || ""),
      }));
    return orgs;
  } catch {
    return [];
  }
}

/* categories is built inside the component with live stats */

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "IOPPS",
      "url": "https://www.iopps.ca",
      "description": "Canada's Indigenous professional platform",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.iopps.ca/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "name": "IOPPS",
      "url": "https://www.iopps.ca",
      "logo": "https://www.iopps.ca/logo.png",
      "description": "Canada's Indigenous professional platform. Jobs, events, scholarships, businesses, schools, and livestreams for Indigenous communities across North America.",
      "sameAs": [],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "url": "https://www.iopps.ca/contact",
      },
    },
  ],
};

export default async function LandingPage() {
  const [stats, partners] = await Promise.all([getStats(), getPartners()]);
  const categories = [
    { icon: "\u{1F4BC}", title: "Jobs & Careers", count: String(stats.jobs || 0), cta: "Browse Jobs", desc: "Indigenous-focused job postings and career opportunities", href: "/jobs" },
    { icon: "\u{1FAB6}", title: "Events & Pow Wows", count: String(stats.events || 0), cta: "Browse Events", desc: "Pow wows, hockey, career fairs, round dances", href: "/events" },
    { icon: "\u{1F393}", title: "Scholarships & Grants", count: "17", cta: "Browse Scholarships", desc: "Funding for students and entrepreneurs", href: "/scholarships" },
    { icon: "\u{1F3EA}", title: "Shop Indigenous", count: String(stats.shops || 0), cta: "Browse Shops", desc: "Support Indigenous-owned businesses", href: "/shop" },
    { icon: "\u{1F4DA}", title: "Schools & Programs", count: "190+", cta: "Browse Schools", desc: "Training and education programs", href: "/schools" },
    { icon: "\u{1F4FA}", title: "IOPPS Spotlight", count: "New", cta: "Watch Now", desc: "Live streams, interviews, and stories", href: "/stories" },
  ];
  return (
    <div className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(48px, 8vw, 100px) clamp(20px, 6vw, 80px) clamp(48px, 6vw, 80px)",
        }}
      >
        {/* Top nav */}
        <div className="relative flex items-center justify-between mb-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <Link
              href="/jobs"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Jobs
            </Link>
            <Link
              href="/events"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Events
            </Link>
            <Link
              href="/partners"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Partners
            </Link>
            <Link
              href="/schools"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Schools
            </Link>
            <Link
              href="/stories"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Stories
            </Link>
            <Link
              href="/shop"
              className="text-sm font-semibold no-underline hidden sm:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Shop
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-semibold no-underline hidden md:inline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Pricing
            </Link>
            <ThemeToggle />
            <MobileMenu />
          </div>
        </div>

        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{ top: -100, right: -100, width: 400, height: 400, background: "rgba(13,148,136,.06)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: -60, left: -60, width: 300, height: 300, background: "rgba(217,119,6,.04)" }}
        />

        <Image
          src="/logo.png"
          alt="IOPPS Logo"
          width={120}
          height={120}
          className="relative mx-auto mb-4"
          priority
        />
        <h1 className="relative text-white font-black tracking-[4px] mb-4 text-4xl md:text-6xl lg:text-[72px]">
          IOPPS
        </h1>

        <p
          className="relative inline-block text-white text-sm font-extrabold tracking-[4px] rounded-full mb-7"
          style={{
            padding: "8px 24px",
            background: "linear-gradient(90deg, rgba(13,148,136,.35), rgba(217,119,6,.25))",
            border: "1px solid rgba(255,255,255,.15)",
          }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>

        <h2 className="relative text-white text-xl md:text-[28px] font-semibold mx-auto mb-4 leading-snug max-w-[600px]">
          Where Indigenous Communities Connect with Opportunities
        </h2>

        <p className="relative text-base leading-relaxed mx-auto mb-3 max-w-[520px]" style={{ color: "rgba(255,255,255,.65)" }}>
          Jobs, events, scholarships, businesses, schools, and livestreams — all in one place for Indigenous people across North America.
        </p>
        <p className="relative text-sm font-bold tracking-[2px] mb-10" style={{ color: "rgba(255,255,255,.45)" }}>
          iopps.ca
        </p>

        <HeroCTA />
      </section>

      {/* Partner Strip */}
      <section className="border-b border-border px-5 md:px-10 lg:px-20 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <p className="text-xs font-bold text-text-muted tracking-[2px] m-0 mb-1">OUR PARTNERS</p>
            <p className="text-[13px] text-text-sec m-0">Organizations investing in Indigenous talent</p>
          </div>
          <PartnerStripCTA />
        </div>

        {partners.length >= 3 ? (
          <div className="relative overflow-hidden">
            {/* Edge fade masks */}
            <div className="absolute left-0 top-0 h-full w-12 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, var(--bg), transparent)" }} />
            <div className="absolute right-0 top-0 h-full w-12 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, var(--bg), transparent)" }} />
            <style>{`
              @keyframes partner-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .partner-track { display: flex; gap: 20px; width: max-content; animation: partner-scroll 30s linear infinite; }
              .partner-track:hover { animation-play-state: paused; }
            `}</style>
            <div className="partner-track">
              {/* Doubled for seamless loop */}
              {[...partners, ...partners].map((p, i) => (
                <Link
                  key={i}
                  href="/partners"
                  className="flex items-center gap-3 rounded-xl transition-all duration-150 shrink-0 no-underline hover:shadow-md"
                  style={{
                    padding: "12px 20px",
                    minWidth: 240,
                    border: p.tier === "school" ? "1.5px solid rgba(13,148,136,.19)" : "1.5px solid var(--border)",
                    background: p.tier === "school" ? "rgba(13,148,136,.02)" : "var(--card)",
                  }}
                >
                  <Avatar name={p.shortName} size={40} src={p.logoUrl} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text m-0 truncate">{p.name}</p>
                    {displayLocation(p.location) && (
                      <p className="text-[11px] text-text-muted m-0 truncate">&#128205; {displayLocation(p.location)}</p>
                    )}
                    <Badge
                      text={p.partnerLabel || (p.tier === "premium" ? "\u2713 Premium" : p.tier === "school" ? "Education Partner" : "Partner")}
                      color={p.tier === "premium" ? "var(--gold)" : p.tier === "school" ? "var(--blue)" : "var(--teal)"}
                      bg={p.tier === "premium" ? "var(--gold-soft)" : p.tier === "school" ? "var(--blue-soft)" : "var(--teal-soft)"}
                      small
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-5 flex-wrap">
            {partners.map((p, i) => (
              <Link
                key={i}
                href="/partners"
                className="flex items-center gap-3 rounded-xl transition-all duration-150 no-underline hover:shadow-md"
                style={{ padding: "12px 20px", border: "1.5px solid var(--border)", background: "var(--card)" }}
              >
                <Avatar name={p.shortName} size={40} src={p.logoUrl} />
                <div>
                  <p className="text-[13px] font-semibold text-text m-0">{p.name}</p>
                  <Badge
                    text={p.partnerLabel || (p.tier === "premium" ? "\u2713 Premium" : p.tier === "school" ? "Education Partner" : "Partner")}
                    color={p.tier === "premium" ? "var(--gold)" : p.tier === "school" ? "var(--blue)" : "var(--teal)"}
                    bg={p.tier === "premium" ? "var(--gold-soft)" : p.tier === "school" ? "var(--blue-soft)" : "var(--teal-soft)"}
                    small
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Impact stats row */}
        <div className="flex flex-wrap justify-center gap-8 mt-6 pt-5 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-extrabold text-teal mb-0">{partners.length || stats.organizations}</p>
            <p className="text-[11px] text-text-muted font-semibold tracking-wide m-0">Partners</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-teal mb-0">100+</p>
            <p className="text-[11px] text-text-muted font-semibold tracking-wide m-0">Open Positions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-teal mb-0">10+</p>
            <p className="text-[11px] text-text-muted font-semibold tracking-wide m-0">Industries</p>
          </div>
        </div>
      </section>

      {/* What's on IOPPS */}
      <section className="px-5 md:px-10 lg:px-20 py-8 md:py-12">
        <h3 className="text-2xl font-extrabold text-text mb-8 text-center">What&apos;s on IOPPS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-[900px] mx-auto">
          {categories.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="p-6 rounded-2xl bg-card text-center transition-all duration-200 border border-border hover:shadow-md no-underline"
            >
              <span className="text-4xl block mb-2">{item.icon}</span>
              <p className="text-xl font-extrabold text-teal mb-0.5">{item.count}</p>
              <p className="text-base font-bold text-text mb-1">{item.title}</p>
              <p className="text-[13px] text-text-sec mb-3">{item.desc}</p>
              <span className="text-sm font-bold text-teal">{item.cta} &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-t border-border px-5 md:px-10 lg:px-20 py-8">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {[
            { value: String(stats.members || 0), label: "Community Members" },
            { value: String(stats.jobs || 0), label: "Jobs Posted" },
            { value: String(stats.events || 0), label: "Events Listed" },
            { value: String(stats.organizations || 0), label: "Organizations" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-teal mb-0.5">{stat.value}</p>
              <p className="text-xs font-semibold text-text-muted tracking-wide m-0">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="text-center border-t border-border px-5 md:px-10 lg:px-20 py-10 md:py-12">
        <p className="text-2xl md:text-3xl font-extrabold text-text mb-2">Join Our Growing Community</p>
        <p className="text-base text-text-sec mb-6 max-w-[480px] mx-auto">
          Connect with Indigenous professionals, organizations, and opportunities across North America.
        </p>
        <BottomCTA />
        <p className="text-teal mt-6 mb-0" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4 }}>
          EMPOWERING INDIGENOUS SUCCESS
        </p>
        <div className="flex items-center justify-center gap-6 mt-6">
          {[
            { href: "/about", label: "About" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/contact", label: "Contact" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-xs font-medium text-text-muted no-underline hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
