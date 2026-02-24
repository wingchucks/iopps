"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { useAuth } from "@/lib/auth-context";

interface EmployerData {
  plan?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  name?: string;
  openJobs?: number;
}

const PLAN_FEATURES: Record<string, { label: string; features: string[]; color: string; jobLimit: string }> = {
  standard: {
    label: "Standard",
    color: "var(--teal)",
    jobLimit: "15 job postings",
    features: ["15 job postings/year", "Basic analytics", "Employer profile", "Community feed access"],
  },
  premium: {
    label: "Premium",
    color: "var(--gold)",
    jobLimit: "Unlimited job postings",
    features: ["Unlimited job postings", "4 featured job slots", "Talent search", "Advanced analytics", "Priority support", "Premium Partner badge"],
  },
  school: {
    label: "School",
    color: "#8B5CF6",
    jobLimit: "Unlimited jobs + programs",
    features: ["Unlimited job postings", "20 program listings", "6 featured slots", "Education Partner badge", "Student pipeline tools"],
  },
  free: {
    label: "Free",
    color: "var(--text-muted)",
    jobLimit: "No job postings",
    features: ["Organization profile", "Community access"],
  },
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/employer/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setEmployer(data.employer || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const currentPlan = employer?.subscriptionTier || employer?.plan || "free";
  const planInfo = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;

  const isActive = employer?.subscriptionStatus === "active" || ["standard", "premium", "school"].includes(currentPlan);

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
      <p className="text-sm text-text-muted mb-8">Manage your subscription and plan details.</p>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold text-text-muted tracking-widest mb-2">CURRENT PLAN</p>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl font-extrabold" style={{ color: planInfo.color }}>{planInfo.label}</h2>
                {isActive && <Badge text="✓ Active" color="#10B981" bg="rgba(16,185,129,.12)" />}
                {!isActive && <Badge text="Inactive" color="var(--text-muted)" bg="var(--border)" />}
              </div>
              <p className="text-sm text-text-muted">{planInfo.jobLimit}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { key: "tier1", name: "Standard", price: "$1,250/yr", desc: "15 job postings, basic analytics", highlight: false },
          { key: "tier2", name: "Premium", price: "$2,500/yr", desc: "Unlimited jobs, talent search, featured", highlight: true },
          { key: "tier3", name: "School", price: "$5,500/yr", desc: "Programs, 20 listings, education tools", highlight: false },
        ].map((p) => (
          <Card key={p.key} className={p.highlight ? "ring-2 ring-teal" : ""}>
            <div className="p-4 text-center">
              {p.highlight && <p className="text-xs font-bold text-teal mb-2 tracking-widest">MOST POPULAR</p>}
              <h3 className="text-lg font-extrabold text-text mb-1">{p.name}</h3>
              <p className="text-2xl font-extrabold mb-2" style={{ color: "var(--teal)" }}>{p.price}</p>
              <p className="text-xs text-text-muted mb-4">{p.desc}</p>
              <Link href={`/org/checkout?plan=${p.key}`}>
                <Button primary={p.highlight} small className="w-full">
                  {currentPlan === p.key.replace("tier1","standard").replace("tier2","premium").replace("tier3","school") ? "Current Plan" : "Select"}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* One-Time Purchases */}
      <h2 className="text-lg font-bold text-text mb-4">One-Time Job Posts</h2>
      <Card className="mb-8">
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: "standard-post", name: "Standard Job Post", price: "$125", desc: "45 days, standard listing" },
              { key: "featured-post", name: "Featured Job Post", price: "$200", desc: "45 days, pinned at top" },
              { key: "program-post", name: "Program Post", price: "$50", desc: "List a training program" },
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
          <a href="mailto:hello@iopps.ca">
            <Button small>Contact Support</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
