"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

const tabs = ["Subscriptions", "Pay Per Post", "Conferences", "Shop Indigenous"] as const;
type Tab = (typeof tabs)[number];

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

function PlanCard({
  title,
  price,
  period,
  features,
  cta,
  href,
  badge,
  gold,
  current,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  badge?: string;
  gold?: boolean;
  current?: boolean;
}) {
  return (
    <Card gold={gold} className="relative flex flex-col">
      <div style={{ padding: "28px 24px 24px" }} className="flex flex-col flex-1">
        {current && (
          <span
            className="absolute top-4 right-4 text-xs font-bold rounded-full"
            style={{
              padding: "4px 12px",
              background: "var(--teal-soft)",
              color: "var(--teal)",
              border: "1px solid var(--teal)",
            }}
          >
            Current Plan
          </span>
        )}
        {badge && !current && (
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

        {current ? (
          <button
            className="w-full py-3 rounded-xl font-semibold text-base"
            style={{ background: "var(--border)", color: "var(--text-sec)", border: "none" }}
            disabled
          >
            Active
          </button>
        ) : (
          <Link href={href} className="no-underline">
            <button
              className="w-full py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
              style={{ background: gold ? "var(--gold)" : "var(--navy)", color: "#fff" }}
            >
              {cta}
            </button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function FreeCard({
  title,
  description,
  features,
  cta,
  href,
}: {
  title: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
}) {
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
        <h3 className="text-2xl font-extrabold text-text mb-2">{title}</h3>
        <p className="text-sm text-text-sec max-w-md mx-auto mb-5">{description}</p>
        <ul className="list-none p-0 m-0 flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-6">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-text-sec">
              <Check />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className="no-underline">
          <button
            className="px-8 py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            {cta}
          </button>
        </Link>
      </div>
    </Card>
  );
}

export default function PricingTabs({
  variant = "public",
  currentPlan,
}: {
  variant?: "public" | "org";
  currentPlan?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Subscriptions");

  const subHref = (plan: string) =>
    variant === "org" ? `/org/checkout?plan=${plan}` : "/org/signup";
  const subCta = variant === "org" ? "Select Plan" : "Get Started";
  const postHref = (plan: string) =>
    variant === "org" ? `/org/checkout?plan=${plan}` : "/org/signup";
  const postCta = variant === "org" ? "Post Now" : "Get Started";
  const freeHref = variant === "org" ? "/org/dashboard" : "/org/signup";
  const freeSuffix = variant === "org" ? "" : " \u2014 It's Free";

  return (
    <>
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

      {/* Tab content */}
      {activeTab === "Subscriptions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard
            title="Standard"
            price="$1,250"
            period="/year"
            features={["15 job posts per year", "Basic analytics", "Email support", "Standard listing visibility"]}
            cta={subCta}
            href={subHref("tier1")}
            current={currentPlan === "tier1"}
          />
          <PlanCard
            title="Premium"
            price="$2,500"
            period="/year"
            badge="Most Popular"
            gold
            features={["Unlimited job posts", "4 featured listings", "Talent search access", "Advanced analytics dashboard", "Priority support"]}
            cta={subCta}
            href={subHref("tier2")}
            current={currentPlan === "tier2"}
          />
          <PlanCard
            title="School"
            price="$5,500"
            period="/year"
            features={["20 program listings", "Unlimited job posts", "6 featured listings", "Dedicated account manager", "Custom branding"]}
            cta={subCta}
            href={subHref("tier3")}
            current={currentPlan === "tier3"}
          />
        </div>
      )}

      {activeTab === "Pay Per Post" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard
            title="Standard Job Post"
            price="$125"
            period="/post"
            features={["45-day listing", "Basic visibility", "Application tracking"]}
            cta={postCta}
            href={postHref("standard-post")}
          />
          <PlanCard
            title="Featured Job Post"
            price="$200"
            period="/post"
            badge="Best Value"
            gold
            features={["45-day listing", "Homepage featured placement", "Highlighted in search", "Priority in feed"]}
            cta={postCta}
            href={postHref("featured-post")}
          />
          <PlanCard
            title="Program Post"
            price="$50"
            period="/post"
            features={["45-day listing", "Program directory placement", "Application tracking"]}
            cta={postCta}
            href={postHref("program-post")}
          />
        </div>
      )}

      {activeTab === "Conferences" && (
        <FreeCard
          title="Events &amp; Conferences"
          description="List your events, conferences, and gatherings at no cost. IOPPS is committed to supporting Indigenous community events."
          features={["Event listing", "RSVP management", "Community visibility", "Unlimited events"]}
          cta={variant === "org" ? "Create Event" : `Get Started${freeSuffix}`}
          href={freeHref}
        />
      )}

      {activeTab === "Shop Indigenous" && (
        <FreeCard
          title="Shop Indigenous"
          description="Showcase and sell Indigenous products, art, and services at no cost. Our marketplace is free for all Indigenous vendors."
          features={["Vendor profile", "Product listings", "Order management", "Analytics dashboard"]}
          cta={variant === "org" ? "Open Shop" : `Get Started${freeSuffix}`}
          href={freeHref}
        />
      )}

      {/* IOPPS Spotlight */}
      <div className="mt-10">
        <Card>
          <div style={{ padding: "28px 24px" }} className="text-center">
            <p className="text-xs font-bold tracking-[2px] mb-2" style={{ color: "var(--gold)" }}>
              IOPPS SPOTLIGHT
            </p>
            <h3 className="text-xl font-extrabold text-text mb-2">Custom Packages</h3>
            <p className="text-sm text-text-sec mb-5 max-w-md mx-auto">
              Contact us for branded content, video interviews, and custom campaigns tailored to your organization.
            </p>
            <a href="mailto:partnership@iopps.ca" className="no-underline">
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

    </>
  );
}
