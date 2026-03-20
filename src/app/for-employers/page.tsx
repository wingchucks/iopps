"use client";

import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

const valueProps = [
  {
    icon: "\u{1F4CB}",
    title: "Post Jobs & Events",
    desc: "Reach thousands of Indigenous professionals with targeted job postings and event listings.",
  },
  {
    icon: "\u{1F4E3}",
    title: "Build Brand Visibility",
    desc: "Showcase your organization to 84,000+ community members and demonstrate your commitment to reconciliation.",
  },
  {
    icon: "\u{1F465}",
    title: "Access Talent Pool",
    desc: "Connect directly with Indigenous professionals, graduates, and skilled tradespeople across North America.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Analytics Dashboard",
    desc: "Track engagement, measure reach, and optimize your recruitment and outreach strategies.",
  },
];

const standardFeatures = [
  "Up to 10 active job postings",
  "Basic organization profile",
  "Event listings",
  "Community feed access",
  "Email support",
];

const premiumFeatures = [
  "Unlimited job postings",
  "Premium profile with featured badge",
  "Priority event placement",
  "Analytics dashboard",
  "Dedicated account manager",
  "Custom branding options",
  "Scholarship program listing",
  "Live stream hosting",
];

export default function ForEmployersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Hero */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(48px, 8vw, 100px) clamp(20px, 6vw, 80px)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            background: "rgba(13,148,136,.06)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: -60,
            left: -60,
            width: 300,
            height: 300,
            background: "rgba(217,119,6,.04)",
          }}
        />

        {/* Top nav */}
        <div className="relative flex items-center justify-between mb-12 z-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
          >
            <Image src="/logo.png" alt="IOPPS" width={36} height={36} />
            <span className="text-white font-black text-xl tracking-[2px]">
              IOPPS
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold no-underline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold no-underline rounded-lg px-4 py-2"
              style={{
                background: "var(--teal)",
                color: "#fff",
              }}
            >
              Join Free
            </Link>
          </div>
        </div>

        <p
          className="relative inline-block text-white text-xs font-extrabold tracking-[3px] rounded-full mb-6"
          style={{
            padding: "6px 20px",
            background: "rgba(255,255,255,.1)",
            border: "1px solid rgba(255,255,255,.15)",
          }}
        >
          FOR EMPLOYERS & ORGANIZATIONS
        </p>

        <h1 className="relative text-white font-black text-3xl md:text-5xl lg:text-[56px] mb-4 leading-tight">
          Partner with IOPPS
        </h1>
        <p
          className="relative text-lg md:text-xl mx-auto mb-10 max-w-[600px] leading-relaxed"
          style={{ color: "rgba(255,255,255,.7)" }}
        >
          Reach 84,000+ Indigenous professionals, students, and community
          members. Build meaningful connections and grow your organization.
        </p>

        <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/org/signup"
            className="inline-block rounded-[14px] px-10 py-4 font-bold text-lg no-underline transition-all"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Get Started
          </Link>
          <Link
            href="/partners"
            className="inline-block rounded-[14px] px-10 py-4 font-bold text-lg no-underline transition-all"
            style={{
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,.25)",
              background: "transparent",
            }}
          >
            View Partners
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-5 md:px-10 lg:px-20 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-text text-center mb-10">
          Why Partner with IOPPS?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1100px] mx-auto">
          {valueProps.map((v, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-card border border-border text-center transition-all hover:shadow-md"
            >
              <span className="text-4xl block mb-3">{v.icon}</span>
              <h3 className="text-base font-bold text-text mb-2">{v.title}</h3>
              <p className="text-sm text-text-sec leading-relaxed m-0">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Tiers */}
      <section
        className="px-5 md:px-10 lg:px-20 py-12 md:py-16"
        style={{ background: "var(--bg-alt, var(--bg))" }}
      >
        <h2 className="text-2xl md:text-3xl font-extrabold text-text text-center mb-3">
          Choose Your Plan
        </h2>
        <p className="text-base text-text-sec text-center mb-10 max-w-[500px] mx-auto">
          Simple, transparent pricing to connect with Indigenous talent and
          communities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto">
          {/* Standard */}
          <div className="rounded-2xl bg-card border border-border p-7">
            <p className="text-xs font-bold tracking-[2px] text-text-muted mb-2">
              STANDARD
            </p>
            <p className="text-3xl font-extrabold text-text mb-1">
              $1,250
              <span className="text-base font-semibold text-text-muted">
                /yr
              </span>
            </p>
            <p className="text-sm text-text-sec mb-6">
              Everything you need to get started
            </p>
            <ul className="space-y-3 mb-8">
              {standardFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-text-sec"
                >
                  <span className="text-teal font-bold shrink-0 mt-px">
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/org/signup"
              className="block text-center rounded-xl py-3 font-bold text-sm no-underline transition-all"
              style={{
                border: "1.5px solid var(--border)",
                color: "var(--text)",
                background: "transparent",
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Premium */}
          <div
            className="rounded-2xl p-7 relative"
            style={{
              background:
                "linear-gradient(160deg, var(--navy), #0D3B66 60%, var(--teal))",
              border: "1.5px solid rgba(13,148,136,.3)",
            }}
          >
            <span
              className="absolute top-4 right-4 text-[10px] font-bold tracking-[1.5px] rounded-full px-3 py-1"
              style={{
                background: "rgba(245,215,142,.15)",
                color: "#F5D78E",
              }}
            >
              RECOMMENDED
            </span>
            <p
              className="text-xs font-bold tracking-[2px] mb-2"
              style={{ color: "rgba(255,255,255,.6)" }}
            >
              PREMIUM
            </p>
            <p className="text-3xl font-extrabold text-white mb-1">
              $2,500
              <span
                className="text-base font-semibold"
                style={{ color: "rgba(255,255,255,.5)" }}
              >
                /yr
              </span>
            </p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,.6)" }}>
              Maximum visibility and impact
            </p>
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ color: "rgba(255,255,255,.8)" }}
                >
                  <span className="font-bold shrink-0 mt-px" style={{ color: "#F5D78E" }}>
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/org/signup"
              className="block text-center rounded-xl py-3 font-bold text-sm no-underline transition-all"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              Get Premium
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-5 md:px-10 lg:px-20 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-text mb-3">
          Ready to Connect?
        </h2>
        <p className="text-base text-text-sec mb-6 max-w-[480px] mx-auto">
          Join leading organizations already partnering with IOPPS to build
          stronger, more inclusive workplaces.
        </p>
        <Link
          href="/org/signup"
          className="inline-block rounded-[14px] px-10 py-4 font-bold text-lg no-underline transition-all"
          style={{ background: "var(--teal)", color: "#fff" }}
        >
          Get Started Today
        </Link>
      </section>

      <Footer />
    </div>
  );
}
