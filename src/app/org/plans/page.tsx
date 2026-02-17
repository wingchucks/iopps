"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";

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
  cta,
  href,
  badge,
  gold,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
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
            {cta}
          </button>
        </Link>
      </div>
    </Card>
  );
}

/* ── Tab content renderers ── */
function Subscriptions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PlanCard
        title="Standard"
        price="$1,250"
        period="/year"
        features={[
          "15 job posts per year",
          "Basic analytics",
          "Email support",
          "Standard listing visibility",
        ]}
        cta="Select Plan"
        href="/org/checkout?plan=tier1"
      />
      <PlanCard
        title="Premium"
        price="$2,500"
        period="/year"
        badge="Most Popular"
        gold
        features={[
          "Unlimited job posts",
          "4 featured listings",
          "Talent search access",
          "Advanced analytics dashboard",
          "Priority support",
        ]}
        cta="Select Plan"
        href="/org/checkout?plan=tier2"
      />
      <PlanCard
        title="School"
        price="$5,500"
        period="/year"
        features={[
          "20 program listings",
          "Unlimited job posts",
          "6 featured listings",
          "Dedicated account manager",
          "Custom branding",
        ]}
        cta="Select Plan"
        href="/org/checkout?plan=tier3"
      />
    </div>
  );
}

function PayPerPost() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PlanCard
        title="Standard Job Post"
        price="$125"
        period="/post"
        features={[
          "45-day listing",
          "Basic visibility",
          "Application tracking",
        ]}
        cta="Post Now"
        href="/org/checkout?plan=standard-post"
      />
      <PlanCard
        title="Featured Job Post"
        price="$200"
        period="/post"
        badge="Best Value"
        gold
        features={[
          "45-day listing",
          "Homepage featured placement",
          "Highlighted in search",
          "Priority in feed",
        ]}
        cta="Post Now"
        href="/org/checkout?plan=featured-post"
      />
      <PlanCard
        title="Program Post"
        price="$50"
        period="/post"
        features={[
          "45-day listing",
          "Program directory placement",
          "Application tracking",
        ]}
        cta="Post Now"
        href="/org/checkout?plan=program-post"
      />
    </div>
  );
}

function Conferences() {
  return (
    <Card className="relative flex flex-col">
      <div style={{ padding: "32px 24px" }} className="text-center">
        <span
          className="inline-block text-xs font-bold rounded-full mb-4"
          style={{
            padding: "4px 14px",
            background: "var(--green-soft)",
            color: "var(--green)",
            border: "1px solid var(--green)",
          }}
        >
          100% FREE
        </span>
        <h3 className="text-2xl font-extrabold text-text mb-2">
          Events &amp; Conferences
        </h3>
        <p className="text-sm text-text-sec max-w-md mx-auto mb-5">
          List your events, conferences, and gatherings at no cost. IOPPS is
          committed to supporting Indigenous community events.
        </p>
        <ul className="list-none p-0 m-0 flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-6">
          {["Event listing", "RSVP management", "Community visibility", "Unlimited events"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-text-sec">
              <Check />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link href="/org/dashboard" className="no-underline">
          <button
            className="px-8 py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Create Event &mdash; It&apos;s Free
          </button>
        </Link>
      </div>
    </Card>
  );
}

function ShopIndigenous() {
  return (
    <Card className="relative flex flex-col">
      <div style={{ padding: "32px 24px" }} className="text-center">
        <span
          className="inline-block text-xs font-bold rounded-full mb-4"
          style={{
            padding: "4px 14px",
            background: "var(--green-soft)",
            color: "var(--green)",
            border: "1px solid var(--green)",
          }}
        >
          100% FREE
        </span>
        <h3 className="text-2xl font-extrabold text-text mb-2">
          Shop Indigenous
        </h3>
        <p className="text-sm text-text-sec max-w-md mx-auto mb-5">
          Showcase and sell Indigenous products, art, and services at no cost.
          Our marketplace is free for all Indigenous vendors.
        </p>
        <ul className="list-none p-0 m-0 flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-6">
          {["Vendor profile", "Product listings", "Order management", "Analytics dashboard"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-text-sec">
              <Check />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link href="/org/dashboard" className="no-underline">
          <button
            className="px-8 py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Open Shop &mdash; It&apos;s Free
          </button>
        </Link>
      </div>
    </Card>
  );
}

const tabContent: Record<Tab, () => React.JSX.Element> = {
  Subscriptions,
  "Pay Per Post": PayPerPost,
  Conferences,
  "Shop Indigenous": ShopIndigenous,
};

/* ── Main page ── */
export default function PlansPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PlansContent />
      </div>
    </ProtectedRoute>
  );
}

function PlansContent() {
  const [activeTab, setActiveTab] = useState<Tab>("Subscriptions");
  const Content = tabContent[activeTab];

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/org/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">
          Plans &amp; Pricing
        </h1>
        <p className="text-sm text-text-muted m-0">
          Choose the plan that works for your organization
        </p>
      </div>

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
  );
}
