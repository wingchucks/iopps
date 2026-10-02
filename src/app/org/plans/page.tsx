"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import PricingTabs from "@/components/PricingTabs";
import { useAuth } from "@/lib/auth-context";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import type { BillingOverview } from "@/lib/pricing";

export default function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = use(searchParams);
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PlansContent redirect={safeAuthRedirect(params.redirect || null)} />
      </div>
    </ProtectedRoute>
  );
}

const PLAN_ID_BY_TIER = { standard: "tier1", premium: "tier2", school: "tier3" } as const;

function PlansContent({ redirect }: { redirect: string | null }) {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingOverview | undefined>();

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    // The same server check checkout enforces, so a blocked annual purchase is never offered.
    (async () => {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const response = await fetch("/api/stripe/checkout", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json() as { billing?: BillingOverview };
      if (!controller.signal.aborted && data.billing) setBilling(data.billing);
    })().catch(() => {});
    return () => controller.abort();
  }, [user]);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href={redirect || "/org/dashboard"}
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; {redirect ? "Back to your job posting" : "Back to Dashboard"}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">
          Promotion Plans
        </h1>
        <p className="text-sm text-text-muted m-0">
          Your profile can stay free. Job postings require a paid posting credit or an eligible annual plan.
        </p>
      </div>

      <PricingTabs
        variant="org"
        currentPlan={billing?.paidTerm ? PLAN_ID_BY_TIER[billing.paidTerm.tier] : undefined}
        annualPlans={billing?.annualPlans}
        canPurchase={billing?.canPurchase ?? true}
        redirect={redirect}
      />
    </div>
  );
}
