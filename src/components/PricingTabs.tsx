"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

const tabs = ["Promotion Plans", "Pay Per Post", "Conferences", "Businesses"] as const;
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
  const [activeTab, setActiveTab] = useState<Tab>("Promotion Plans");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      {activeTab === "Promotion Plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard
            title="Visibility Boost"
            price="$1,250"
            period="/year"
            features={["15 job posts per year", "Business profile promotion", "Basic analytics", "Standard directory visibility"]}
            cta={subCta}
            href={subHref("tier1")}
            current={currentPlan === "tier1"}
          />
          <PlanCard
            title="Featured Employer"
            price="$2,500"
            period="/year"
            badge="Most Popular"
            gold
            features={["Unlimited job posts", "Featured business placement", "Talent search access", "Advanced analytics dashboard", "Priority support"]}
            cta={subCta}
            href={subHref("tier2")}
            current={currentPlan === "tier2"}
          />
          <PlanCard
            title="School Growth"
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

      {activeTab === "Businesses" && (
        <div className="grid grid-cols-1 gap-6">
          <FreeCard
            title="Indigenous Businesses"
            description="Indigenous businesses and employers can create a profile on IOPPS for free and join the opportunities network without a promotion fee."
            features={["Free business profile", "Directory visibility", "Jobs and events listing", "Community discovery"]}
            cta={variant === "org" ? "Manage Profile" : `Create Free Profile${freeSuffix}`}
            href={freeHref}
          />
          <Card>
            <div style={{ padding: "28px 24px" }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[2px] mb-2" style={{ color: "var(--gold)" }}>
                    PROMOTED VISIBILITY
                  </p>
                  <h3 className="text-xl font-extrabold text-text mb-2">Non-Indigenous Companies</h3>
                  <p className="text-sm text-text-sec max-w-2xl mb-0">
                    Non-Indigenous companies can still create a profile and participate on IOPPS. Payment is only required when they want promoted visibility, featured placement, or campaign support.
                  </p>
                </div>
                <div
                  className="rounded-2xl"
                  style={{
                    padding: "14px 16px",
                    background: "var(--gold-soft)",
                    border: "1px solid rgba(217,119,6,.24)",
                    minWidth: 220,
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--gold)" }}>How it works</p>
                  <p className="text-sm text-text-sec mb-0">Profile creation is free. Promotion is optional and paid.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
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

      {/* FAQ */}
      <div className="mt-10">
        <h3 className="text-xl font-extrabold text-text text-center mb-6">Frequently Asked Questions</h3>
        <Card>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {([
              {
                q: "What is the billing cycle?",
                a: "All subscription plans are billed annually. This keeps pricing simple and gives you uninterrupted access to your plan features for the full year.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards. For School plan customers, we also offer invoicing with net-30 payment terms.",
              },
              {
                q: "What happens when my subscription expires?",
                a: "When your subscription ends, your active job and program listings are archived. They won't appear in search results, but all your data is preserved and listings are restored when you renew.",
              },
              {
                q: "Are events free?",
                a: "Yes! Community events are always free to post and attend on IOPPS.",
              },
              {
                q: "Is creating a business profile free?",
                a: "Yes. Indigenous businesses and employers can create a free profile on IOPPS, appear in the directory, and join the opportunities network without a promotion fee.",
              },
            ] as { q: string; a: string }[]).map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left cursor-pointer bg-transparent border-none"
                style={{ padding: "16px 24px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {faq.q}
                  </span>
                  <span
                    className="text-lg flex-shrink-0 leading-none"
                    style={{ color: "var(--text-sec)" }}
                  >
                    {openFaq === i ? "\u2212" : "+"}
                  </span>
                </div>
                {openFaq === i && (
                  <p className="text-sm mt-2 mb-0" style={{ color: "var(--text-sec)", lineHeight: 1.6 }}>
                    {faq.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
