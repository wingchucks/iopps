"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import type { FeaturedJobSummary } from "@/components/FeaturedJobControl";
import { useAuth } from "@/lib/auth-context";
import {
  BILLING_SUPPORT_EMAIL,
  COMPLIMENTARY_ACCESS_DETAIL,
  COMPLIMENTARY_ACCESS_LABEL,
  ONE_TIME_PLANS,
  SUBSCRIPTION_PLANS,
  formatBillingDate,
  lapsedPaidTier,
  type AnnualPurchaseOption,
  type BillingOverview,
} from "@/lib/pricing";

interface EmployerData {
  plan?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  billingStartAt?: string;
  bonusAccessGrantedAt?: string;
  bonusAccessEndsAt?: string;
  bonusAccessReason?: string;
  name?: string;
  openJobs?: number;
  standardPostCredits?: number;
  featuredSummary?: FeaturedJobSummary | null;
}

const PLAN_FEATURES: Record<string, { label: string; features: string[]; color: string; jobLimit: string }> = {
  standard: {
    label: SUBSCRIPTION_PLANS.tier1.title,
    color: "var(--teal)",
    jobLimit: SUBSCRIPTION_PLANS.tier1.jobLimit,
    features: SUBSCRIPTION_PLANS.tier1.features,
  },
  premium: {
    label: SUBSCRIPTION_PLANS.tier2.title,
    color: "var(--gold)",
    jobLimit: SUBSCRIPTION_PLANS.tier2.jobLimit,
    features: SUBSCRIPTION_PLANS.tier2.features,
  },
  school: {
    label: SUBSCRIPTION_PLANS.tier3.title,
    color: "#8B5CF6",
    jobLimit: SUBSCRIPTION_PLANS.tier3.jobLimit,
    features: SUBSCRIPTION_PLANS.tier3.features,
  },
  free: {
    label: "Free",
    color: "var(--text-muted)",
    jobLimit: "Job postings purchased separately",
    features: ["Organization profile with directory review", "Paid job posting options", "Application management", "Events and scholarships"],
  },
};

// Complimentary ($0 admin or Hermes) access is deliberately not a paid plan: it never funds postings.
const COMPLIMENTARY_FEATURES = [
  "Organization profile with directory review",
  "Events and scholarships",
  "Application management for jobs you publish",
  "Job postings use paid posting credits or a paid annual plan",
];

export default function BillingPage() {
  return (
    <OrgRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <BillingContent />
        </div>
      </AppShell>
    </OrgRoute>
  );
}

function BillingContent() {
  const { user } = useAuth();
  const [employer, setEmployer] = useState<EmployerData | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [publishingNotice, setPublishingNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/employer/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setEmployer((data.employer as EmployerData | null) || null);
        setBilling((data.billing as BillingOverview | null) || null);
        setPublishingNotice(typeof data.publishingUnavailable?.message === "string" ? data.publishingUnavailable.message : null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // The server billing overview is authoritative: only a paid annual term is a paid plan.
  const paidTerm = billing?.paidTerm ?? null;
  const complimentary = paidTerm ? null : billing?.complimentary ?? null;
  // A paid plan whose term has ended stays named on the account until the daily expiry job
  // runs: show it as inactive, so the lapse is visible, rather than as an active Free plan.
  const lapsedTier = billing && !paidTerm && !complimentary ? lapsedPaidTier(employer, new Date()) : null;
  const currentPlan = billing ? (paidTerm?.tier ?? lapsedTier ?? "free") : (employer?.subscriptionTier || employer?.plan || "free");
  const planInfo = complimentary
    ? { label: `Complimentary ${PLAN_FEATURES[complimentary.tier]?.label ?? "access"}`, color: "var(--text-muted)", jobLimit: COMPLIMENTARY_ACCESS_LABEL, features: COMPLIMENTARY_FEATURES }
    : PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;
  const billingStart = employer?.billingStartAt || employer?.subscriptionStart;
  const billingStartLabel = billingStart ? formatBillingDate(billingStart) : null;
  const termStartLabel = paidTerm ? formatBillingDate(paidTerm.startsAt) : billingStartLabel;
  const termEndLabel = paidTerm ? formatBillingDate(paidTerm.endsAt) : complimentary?.endsAt ? formatBillingDate(complimentary.endsAt) : null;
  const hasBonusAccess = Boolean(paidTerm && employer?.bonusAccessGrantedAt && billingStart && new Date(billingStart).getTime() > Date.now());
  const isActive = Boolean(paidTerm) || (!complimentary && currentPlan === "free");

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 md:px-6">
      <Link href="/org/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold no-underline mb-6" style={{ color: "var(--teal)" }}>
        ← Back to Dashboard
      </Link>

      <h1 className="text-2xl font-extrabold text-text mb-1">Billing & Plan</h1>
      <p className="text-sm text-text-muted mb-8">Job postings require a paid credit or an eligible annual plan. Standard postings run for 30 days; featured postings run for your choice of up to 45 days.</p>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold text-text-muted tracking-widest mb-2">CURRENT PLAN</p>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h2 className="text-3xl font-extrabold" style={{ color: planInfo.color }}>{planInfo.label}</h2>
                {complimentary && <Badge text="Complimentary" color="var(--text-muted)" bg="var(--border)" />}
                {!complimentary && isActive && <Badge text="✓ Active" color="#10B981" bg="rgba(16,185,129,.12)" />}
                {!complimentary && !isActive && <Badge text="Inactive" color="var(--text-muted)" bg="var(--border)" />}
              </div>
              <p className="text-sm text-text-muted">{planInfo.jobLimit}</p>
              {complimentary && (
                <p className="mt-2 mb-0 max-w-[520px] text-xs text-text-muted">
                  {COMPLIMENTARY_ACCESS_DETAIL}{termEndLabel ? ` Complimentary access ends ${termEndLabel}.` : ""}
                </p>
              )}
              {hasBonusAccess && billingStartLabel && (
                <div className="mt-3 rounded-xl border border-[var(--gold-soft)] px-4 py-3" style={{ background: "rgba(217,119,6,.08)" }}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--gold)" }}>
                    Bonus early access
                  </p>
                  <p className="m-0 text-sm text-text">
                    Your access is active now as a bonus. Your paid {planInfo.label} term begins on <strong>{billingStartLabel}</strong>.
                  </p>
                  {employer?.bonusAccessReason && (
                    <p className="mt-1 mb-0 text-xs text-text-muted">{employer.bonusAccessReason}</p>
                  )}
                </div>
              )}
              {!hasBonusAccess && paidTerm && termStartLabel && (
                <p className="mt-3 text-xs text-text-muted">
                  Plan start: {termStartLabel}{termEndLabel ? ` · Ends: ${termEndLabel}` : ""}
                </p>
              )}
              {billing?.renewal && (
                <p className="mt-1 text-xs text-text-muted">
                  Renewal paid: {SUBSCRIPTION_PLANS[billing.renewal.tier === "standard" ? "tier1" : billing.renewal.tier === "premium" ? "tier2" : "tier3"].title} from {formatBillingDate(billing.renewal.startsAt)} to {formatBillingDate(billing.renewal.endsAt)}.
                </p>
              )}
              {billing?.reviewRequired && (
                <p className="mt-3 mb-0 rounded-xl px-4 py-3 text-sm text-text" style={{ background: "rgba(217,119,6,.08)", border: "1px solid var(--gold-soft)" }}>
                  Your annual plan needs a quick review by IOPPS before it can be renewed or changed. Contact {BILLING_SUPPORT_EMAIL}. Single job postings can still be purchased.
                </p>
              )}
              {publishingNotice && (
                <p className="mt-3 mb-0 rounded-xl px-4 py-3 text-sm text-text" style={{ background: "rgba(217,119,6,.08)", border: "1px solid var(--gold-soft)" }}>
                  {publishingNotice}
                </p>
              )}
              {employer?.featuredSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                  {[
                    // Paid single job postings; featured credits are shown separately.
                    { label: "Job Post Credits", value: `${Number.isSafeInteger(employer.standardPostCredits) ? employer.standardPostCredits : 0}` },
                    { label: "Featured Used", value: `${employer.featuredSummary.featuredSlotsUsed}` },
                    { label: "Plan Slots", value: `${employer.featuredSummary.featuredSlotsTotal}` },
                    { label: "Slots Left", value: `${employer.featuredSummary.featuredSlotsRemaining}` },
                    { label: "Featured Credits", value: `${employer.featuredSummary.featuredPostCredits}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,.03)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] font-bold tracking-widest text-text-muted mb-1 uppercase">{item.label}</p>
                      <p className="text-sm font-extrabold text-text">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {currentPlan !== "premium" && (
              <Link href="/org/plans">
                <Button primary small>Upgrade Plan</Button>
              </Link>
            )}
            {currentPlan === "premium" && (
              <Link href="/org/plans">
                <Button small>View Plans</Button>
              </Link>
            )}
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-bold text-text-muted tracking-widest mb-3">PLAN INCLUDES</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planInfo.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-text-sec">
                  <span style={{ color: planInfo.color }}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Plan Pricing Overview */}
      <h2 className="text-lg font-bold text-text mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {([
          { key: "tier1", name: SUBSCRIPTION_PLANS.tier1.title, price: `${SUBSCRIPTION_PLANS.tier1.priceLabel}${SUBSCRIPTION_PLANS.tier1.periodLabel}`, desc: SUBSCRIPTION_PLANS.tier1.shortDescription, highlight: false },
          { key: "tier2", name: SUBSCRIPTION_PLANS.tier2.title, price: `${SUBSCRIPTION_PLANS.tier2.priceLabel}${SUBSCRIPTION_PLANS.tier2.periodLabel}`, desc: SUBSCRIPTION_PLANS.tier2.shortDescription, highlight: true },
        ] as const).map((p) => (
          <Card key={p.key} className={p.highlight ? "ring-2 ring-teal" : ""}>
            <div className="p-4 text-center">
              {p.highlight && <p className="text-xs font-bold text-teal mb-2 tracking-widest">MOST POPULAR</p>}
              <h3 className="text-lg font-extrabold text-text mb-1">{p.name}</h3>
              <p className="text-2xl font-extrabold mb-2" style={{ color: "var(--teal)" }}>{p.price}</p>
              <p className="text-xs text-text-muted mb-4">{p.desc}</p>
              <AnnualPlanAction planId={p.key} option={billing?.annualPlans[p.key] ?? null} canPurchase={billing?.canPurchase ?? true} highlight={p.highlight} />
            </div>
          </Card>
        ))}
      </div>

      {/* One-Time Purchases */}
      <h2 className="text-lg font-bold text-text mb-4">Single Job Postings</h2>
      <Card className="mb-8">
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "standard-post", name: ONE_TIME_PLANS["standard-post"].title, price: ONE_TIME_PLANS["standard-post"].priceLabel, desc: ONE_TIME_PLANS["standard-post"].shortDescription },
              { key: "featured-post", name: ONE_TIME_PLANS["featured-post"].title, price: ONE_TIME_PLANS["featured-post"].priceLabel, desc: ONE_TIME_PLANS["featured-post"].shortDescription },
            ].map((p) => (
              <div key={p.key} className="flex flex-col gap-1">
                <p className="font-bold text-text text-sm">{p.name}</p>
                <p className="text-xl font-extrabold" style={{ color: "var(--teal)" }}>{p.price}</p>
                <p className="text-xs text-text-muted mb-2">{p.desc}</p>
                <Link href={`/org/checkout?plan=${p.key}`}>
                  <Button small>Purchase</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Support */}
      <Card>
        <div className="p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-text mb-1">Need help with billing?</p>
            <p className="text-sm text-text-muted">Contact us and we&apos;ll get back to you quickly.</p>
          </div>
          <a href={`mailto:${BILLING_SUPPORT_EMAIL}`}>
            <Button small>Contact Support</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

/** Never offers an annual purchase checkout would refuse: current plan, plan change or renewal. */
function AnnualPlanAction({ planId, option, canPurchase, highlight }: { planId: "tier1" | "tier2"; option: AnnualPurchaseOption | null; canPurchase: boolean; highlight: boolean }) {
  if (option && !option.available) {
    return (
      <div className="flex flex-col gap-2">
        <Button small className="w-full" disabled>{option.label ?? "Not available"}</Button>
        {option.message && <p className="m-0 text-xs text-text-muted">{option.message}</p>}
        {option.reason === "plan_change" && (
          <a href={`mailto:${BILLING_SUPPORT_EMAIL}?subject=${encodeURIComponent("Change my IOPPS plan")}`} className="text-xs font-semibold" style={{ color: "var(--teal)" }}>
            Contact us to change plans
          </a>
        )}
      </div>
    );
  }
  if (!canPurchase) {
    return <Button small className="w-full" disabled>Owner purchases only</Button>;
  }
  return (
    <div className="flex flex-col gap-2">
      <Link href={`/org/checkout?plan=${planId}`}>
        <Button primary={highlight} small className="w-full">
          {option?.kind === "renewal" ? "Renew for another year" : "Select"}
        </Button>
      </Link>
      {option?.kind === "renewal" && option.message && <p className="m-0 text-xs text-text-muted">{option.message}</p>}
    </div>
  );
}
