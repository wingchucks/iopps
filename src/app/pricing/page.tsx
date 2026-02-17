"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";

const tabs = ["Subscriptions", "Pay Per Post", "Conferences", "Shop Indigenous"] as const;
type Tab = (typeof tabs)[number];

/* ── Checkmark icon ── */
function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Plan card ── */
function PlanCard({
  title,
  price,
  period,
  features,
  href,
  badge,
  gold,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  href: string;
  badge?: string;
  gold?: boolean;
}) {
  return (
    <Card gold={gold} className="relative flex flex-col">
      <div style={{ padding: "28px 24px 24px" }} className="flex flex-col flex-1">
        {badge && (
          <span
            className="absolute top-4 right-4 text-xs font-bold rounded-full"
            style={{
              padding: "4px 12px",
              background: "var(--gold-soft)",
              color: "var(--gold)",
              border: "1px solid var(--gold)",
            }}
          >
            {badge}
          </span>
        )}

        <h3 className="text-lg font-bold text-text mb-1">{title}</h3>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-3xl font-extrabold text-text">{price}</span>
          <span className="text-sm text-text-muted">{period}</span>
        </div>

        <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-6 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-text-sec">
              <Check />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link href={href} className="no-underline">
          <button
            className="w-full py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
            style={{
              background: gold ? "var(--gold)" : "var(--navy)",
              color: "#fff",
            }}
          >
            Get Started
          </button>
        </Link>
      </div>
    </Card>
  );
}

/* ── Tab content renderers ── */
function Subscriptions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PlanCard
        title="Essential"
        price="$1,250"
        period="/year"
        features={[
          "10 job posts per year",
          "Basic analytics",
          "Email support",
          "Standard listing visibility",
        ]}
        href="/org/signup"
      />
      <PlanCard
        title="Professional"
        price="$2,500"
        period="/year"
        badge="Most Popular"
        gold
        features={[
          "Unlimited job posts",
          "Advanced analytics dashboard",
          "Talent search access",
          "Priority support",
          "Featured listings",
          "Conference hosting",
        ]}
        href="/org/signup"
      />
    </div>
  );
}

function PayPerPost() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PlanCard
        title="Standard Post"
        price="$125"
        period="/post"
        features={[
          "30-day listing",
          "Basic visibility",
          "Application tracking",
        ]}
        href="/org/signup"
      />
      <PlanCard
        title="Featured Post"
        price="$300"
        period="/post"
        badge="Best Value"
        gold
        features={[
          "60-day listing",
          "Homepage featured placement",
          "Highlighted in search",
          "Priority in feed",
        ]}
        href="/org/signup"
      />
    </div>
  );
}

function Conferences() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PlanCard
        title="Standard"
        price="$250"
        period="/event"
        features={[
          "Event listing",
          "RSVP management",
          "Basic analytics",
        ]}
        href="/org/signup"
      />
      <PlanCard
        title="Premium"
        price="$400"
        period="/event"
        badge="Featured"
        gold
        features={[
          "Featured placement",
          "Livestream integration",
          "Extended 90-day visibility",
          "Sponsor showcase",
        ]}
        href="/org/signup"
      />
    </div>
  );
}

function ShopIndigenous() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PlanCard
        title="Monthly"
        price="$50"
        period="/month"
        features={[
          "Vendor profile",
          "Product listings",
          "Basic analytics",
        ]}
        href="/org/signup"
      />
      <PlanCard
        title="Annual"
        price="$400"
        period="/year"
        badge="Save 33%"
        gold
        features={[
          "All monthly features",
          "Featured vendor placement",
          "Priority search ranking",
        ]}
        href="/org/signup"
      />
    </div>
  );
}

const tabContent: Record<Tab, () => React.JSX.Element> = {
  Subscriptions,
  "Pay Per Post": PayPerPost,
  Conferences,
  "Shop Indigenous": ShopIndigenous,
};

/* ── Main page ── */
export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Subscriptions");
  const Content = tabContent[activeTab];

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section
        className="relative text-center overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px) clamp(32px, 4vw, 56px)",
        }}
      >
        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.06)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: -40, left: -40, width: 200, height: 200, background: "rgba(217,119,6,.04)" }}
        />

        {/* Nav links */}
        <div className="relative flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-white font-black text-xl tracking-[2px] no-underline"
          >
            IOPPS
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
              className="text-sm font-semibold no-underline px-5 py-2 rounded-xl"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              Join Free
            </Link>
          </div>
        </div>

        <h1 className="relative text-white text-3xl md:text-5xl font-extrabold mb-3">
          Simple, Transparent Pricing
        </h1>
        <p
          className="relative text-base md:text-lg mx-auto max-w-lg mb-0"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          Choose the plan that works for your organization
        </p>
      </section>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10 md:py-10">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all whitespace-nowrap"
                style={{
                  background: active ? "var(--navy)" : "var(--card)",
                  color: active ? "#fff" : "var(--text-sec)",
                  border: active ? "none" : "1px solid var(--border)",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <Content />

        {/* IOPPS Spotlight */}
        <div className="mt-10">
          <Card>
            <div
              style={{ padding: "28px 24px" }}
              className="text-center"
            >
              <p
                className="text-xs font-bold tracking-[2px] mb-2"
                style={{ color: "var(--gold)" }}
              >
                IOPPS SPOTLIGHT
              </p>
              <h3 className="text-xl font-extrabold text-text mb-2">
                Custom Packages
              </h3>
              <p className="text-sm text-text-sec mb-5 max-w-md mx-auto">
                Contact us for branded content, video interviews, and custom
                campaigns tailored to your organization.
              </p>
              <a
                href="mailto:partnerships@iopps.ca"
                className="no-underline"
              >
                <button
                  className="px-8 py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "var(--teal)", color: "#fff" }}
                >
                  Contact Us
                </button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
