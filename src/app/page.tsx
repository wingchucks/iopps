import Link from "next/link";
import Image from "next/image";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";
import { adminDb } from "@/lib/firebase-admin";

async function getStats() {
  if (!adminDb) return { members: 0, jobs: 0, organizations: 0, events: 0 };
  try {
    const [usersSnap, jobsSnap, employersSnap, eventsSnap] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("jobs").where("status", "==", "active").count().get(),
      adminDb.collection("employers").where("status", "==", "approved").count().get(),
      adminDb.collection("events").count().get(),
    ]);
    return {
      members: usersSnap.data().count,
      jobs: jobsSnap.data().count,
      organizations: employersSnap.data().count,
      events: eventsSnap.data().count,
    };
  } catch {
    return { members: 0, jobs: 0, organizations: 0, events: 0 };
  }
}

const partners: { name: string; short: string; tier: string; logo?: string }[] = [
  { name: "Saskatchewan Indian Gaming Authority", short: "SIGA", tier: "premium", logo: "https://storage.googleapis.com/iopps-c2224.firebasestorage.app/employers/sR78eEVUvvVaOFLGcUudlD0s0gq1/logo/siga-logo.png" },
  { name: "Saskatoon Tribal Council", short: "STC", tier: "premium", logo: "https://storage.googleapis.com/iopps-c2224.firebasestorage.app/employers/tsRvNLiRWARbOoiBOiEVFDwFfZn2/logo/stc-logo.png" },
  { name: "Westland Insurance Group Ltd.", short: "Westland", tier: "premium", logo: "https://storage.googleapis.com/iopps-c2224.firebasestorage.app/employers/UyTZcF7xEiRmBnSEzcSMmw9MXvL2/logo/westland-logo.png" },
];

/* categories is built inside the component with live stats */

export default async function LandingPage() {
  const stats = await getStats();
  const categories = [
    { icon: "\u{1F4BC}", title: "Jobs & Careers", count: String(stats.jobs || 0), cta: "Browse Jobs", desc: "Indigenous-focused job postings and career opportunities", href: "/jobs" },
    { icon: "\u{1FAB6}", title: "Events & Pow Wows", count: String(stats.events || 0), cta: "Browse Events", desc: "Pow wows, hockey, career fairs, round dances", href: "/events" },
    { icon: "\u{1F393}", title: "Scholarships & Grants", count: "17", cta: "Browse Scholarships", desc: "Funding for students and entrepreneurs", href: "/scholarships" },
    { icon: "\u{1F3EA}", title: "Shop Indigenous", count: "Coming Soon", cta: "Browse Shops", desc: "Support Indigenous-owned businesses", href: "/shop" },
    { icon: "\u{1F4DA}", title: "Schools & Programs", count: "190+", cta: "Browse Schools", desc: "Training and education programs", href: "/schools" },
    { icon: "\u{1F4FA}", title: "IOPPS Spotlight", count: "New", cta: "Watch Now", desc: "Live streams, interviews, and stories", href: "/stories" },
  ];
  return (
    <div className="min-h-screen bg-bg">
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

        <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link href="/signup">
            <Button
              primary
              style={{
                background: "var(--teal)",
                fontSize: 17,
                padding: "16px 40px",
                borderRadius: 14,
                fontWeight: 700,
              }}
            >
              Join the Community
            </Button>
          </Link>
          <Link href="/login">
            <Button
              style={{
                color: "#fff",
                borderColor: "rgba(255,255,255,.25)",
                fontSize: 17,
                padding: "16px 40px",
                borderRadius: 14,
              }}
            >
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="border-b border-border px-5 md:px-10 lg:px-20 py-8">
        <div className="flex justify-between items-center mb-5">
          <p className="text-xs font-bold text-text-muted tracking-[2px] m-0">OUR PARTNERS</p>
          <p className="text-text-muted tracking-[2.5px] m-0 opacity-50" style={{ fontSize: 9, fontWeight: 800 }}>
            EMPOWERING INDIGENOUS SUCCESS
          </p>
        </div>
        <div
          className="partner-strip flex gap-6 flex-nowrap overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          <style>{`.partner-strip::-webkit-scrollbar{display:none}`}</style>
          {partners.map((p, i) => (
            <Link
              key={i}
              href="/partners"
              className="flex items-center gap-3 rounded-xl transition-all duration-150 min-w-[180px] shrink-0 no-underline hover:shadow-md"
              style={{
                padding: "12px 20px",
                border:
                  p.tier === "school"
                    ? "1.5px solid rgba(13,148,136,.19)"
                    : "1.5px solid var(--border)",
                background: p.tier === "school" ? "rgba(13,148,136,.02)" : "var(--card)",
              }}
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.short}
                  className="shrink-0 object-contain rounded-lg"
                  style={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar
                  name={p.short}
                  size={40}
                  src={p.logo}
                  gradient={
                    p.tier === "school"
                      ? "linear-gradient(135deg, rgba(13,148,136,.13), rgba(37,99,235,.09))"
                      : "linear-gradient(135deg, rgba(15,43,76,.06), rgba(13,148,136,.05))"
                  }
                />
              )}
              <div>
                <p className="text-[13px] font-semibold text-text m-0">{p.name}</p>
                <Badge
                  text={"\u2713 Premium Partner"}
                  color={"var(--gold)"}
                  bg={"var(--gold-soft)"}
                  small
                />
              </div>
            </Link>
          ))}
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
        <Link href="/signup">
          <Button
            primary
            style={{
              background: "var(--teal)",
              fontSize: 16,
              padding: "14px 36px",
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            Get Started
          </Button>
        </Link>
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
