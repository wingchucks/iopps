"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS, getPlanById, type BillingPlanId } from "@/lib/pricing";

/* ── Plan configuration ── */
interface PlanConfig {
  name: string;
  price: number;
  billingCycle: "monthly" | "annual" | "one-time";
  period: string;
}

const plans: Record<BillingPlanId, PlanConfig> = {
  tier1: { name: SUBSCRIPTION_PLANS.tier1.title, price: SUBSCRIPTION_PLANS.tier1.amount, billingCycle: "annual", period: SUBSCRIPTION_PLANS.tier1.periodLabel },
  tier2: { name: SUBSCRIPTION_PLANS.tier2.title, price: SUBSCRIPTION_PLANS.tier2.amount, billingCycle: "annual", period: SUBSCRIPTION_PLANS.tier2.periodLabel },
  tier3: { name: SUBSCRIPTION_PLANS.tier3.title, price: SUBSCRIPTION_PLANS.tier3.amount, billingCycle: "annual", period: SUBSCRIPTION_PLANS.tier3.periodLabel },
  "standard-post": { name: ONE_TIME_PLANS["standard-post"].title, price: ONE_TIME_PLANS["standard-post"].amount, billingCycle: "one-time", period: ONE_TIME_PLANS["standard-post"].periodLabel },
  "featured-post": { name: ONE_TIME_PLANS["featured-post"].title, price: ONE_TIME_PLANS["featured-post"].amount, billingCycle: "one-time", period: ONE_TIME_PLANS["featured-post"].periodLabel },
  "program-post": { name: ONE_TIME_PLANS["program-post"].title, price: ONE_TIME_PLANS["program-post"].amount, billingCycle: "one-time", period: ONE_TIME_PLANS["program-post"].periodLabel },
};

const GST_RATE = 0.05;

/* ── Main page ── */
export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = use(searchParams);
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <CheckoutContent planKey={params.plan || "tier1"} />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function CheckoutContent({ planKey }: { planKey: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const plan = getPlanById(planKey)
    ? plans[planKey as BillingPlanId]
    : plans.tier1;
  const gst = plan.price * GST_RATE;
  const total = plan.price + gst;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!user || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planKey, orgId: user.uid }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned");
        setSubmitting(false);
      }
    } catch {
      setError("Failed to start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/org/plans"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Plans
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">Checkout</h1>
        <p className="text-sm text-text-muted m-0">Review your order and proceed to payment</p>
      </div>

      {/* Order summary */}
      <Card>
        <div style={{ padding: "28px 24px" }}>
          <h2 className="text-lg font-bold text-text mb-5">Order Summary</h2>

          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-text-sec">{plan.name}</span>
            <span className="text-sm font-semibold text-text">
              ${plan.price.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-text-sec">GST (5%)</span>
            <span className="text-sm font-semibold text-text">
              ${gst.toFixed(2)}
            </span>
          </div>

          <div
            className="flex justify-between items-center pt-3 mb-5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-base font-bold text-text">Total</span>
            <span className="text-base font-bold text-text">
              ${total.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-text-muted mb-5">
            {plan.billingCycle === "one-time"
              ? "One-time payment"
              : `Billed ${plan.billingCycle}`}
          </p>

          {/* Error message */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm mb-4"
              style={{
                background: "var(--red-soft, #fef2f2)",
                color: "var(--red, #dc2626)",
                border: "1px solid var(--red, #dc2626)",
              }}
            >
              {error}
            </div>
          )}

          {/* Checkout button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "var(--navy)", color: "#fff" }}
          >
            {submitting ? "Redirecting to payment..." : "Proceed to Payment"}
          </button>

          <p className="text-xs text-text-muted text-center mt-3">
            You&apos;ll be redirected to Stripe for secure payment processing
          </p>
        </div>
      </Card>
    </div>
  );
}
