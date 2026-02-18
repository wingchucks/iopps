"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import PricingTabs from "@/components/PricingTabs";
import { useAuth } from "@/lib/auth-context";
import { getOrgSubscriptions } from "@/lib/firestore/subscriptions";

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
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    getOrgSubscriptions(user.uid)
      .then((subs) => {
        const active = subs.find((s) => s.status === "active" || s.status === "pending");
        if (active) setCurrentPlan(active.plan);
      })
      .catch(() => {});
  }, [user]);

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

      <PricingTabs variant="org" currentPlan={currentPlan} />
    </div>
  );
}
