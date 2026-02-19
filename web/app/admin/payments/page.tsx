"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Subscription {
  id: string;
  name: string;
  plan: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  email: string | null;
}

interface OneTimePayment {
  id: string;
  title: string;
  employer: string;
  paymentType: string;
  amount: number | null;
  paidAt: string | null;
  status: string;
}

interface Summary {
  monthlyRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  oneTimePayments: number;
}

type Tab = "active" | "expired" | "onetime";

const PLAN_LABELS: Record<string, string> = {
  essential: "Essential — $1,250/yr",
  professional: "Professional — $2,500/yr",
  school: "School — $5,500/yr",
};

function maskId(id: string | null): string {
  if (!id) return "—";
  if (id.length <= 8) return id;
  return id.slice(0, 4) + "••••" + id.slice(-4);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [active, setActive] = useState<Subscription[]>([]);
  const [expired, setExpired] = useState<Subscription[]>([]);
  const [oneTime, setOneTime] = useState<OneTimePayment[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/payments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSummary(data.summary);
        setActive(data.active);
        setExpired(data.expired);
        setOneTime(data.oneTime);
      } catch {
        toast.error("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: `Active Subs (${active.length})` },
    { key: "expired", label: `Expired (${expired.length})` },
    { key: "onetime", label: `One-Time (${oneTime.length})` },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">Payments & Revenue</h1>
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Payments & Revenue</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Monthly Revenue",
            value: `$${(summary?.monthlyRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`,
            color: "text-green-500",
          },
          {
            label: "Active Subscriptions",
            value: summary?.activeSubscriptions ?? 0,
            color: "text-accent",
          },
          {
            label: "Expired / Lapsed",
            value: summary?.expiredSubscriptions ?? 0,
            color: "text-red-500",
          },
          {
            label: "One-Time Payments",
            value: summary?.oneTimePayments ?? 0,
            color: "text-[var(--text-muted)]",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--card-border)] bg-surface p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {card.label}
            </p>
            <p className={cn("mt-1 text-2xl font-bold", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--card-border)] bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-accent text-white"
                : "text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-surface">
        {tab === "active" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Renewal</th>
                <th className="px-4 py-3">Stripe Sub ID</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr
                  key={s.id}
                  className={cn(
                    "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]",
                    s.plan?.toLowerCase() === "school" && "bg-amber-500/5"
                  )}
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        s.plan?.toLowerCase() === "school"
                          ? "bg-amber-500/15 text-amber-600"
                          : s.plan?.toLowerCase() === "professional"
                          ? "bg-blue-500/15 text-blue-500"
                          : "bg-green-500/15 text-green-600"
                      )}
                    >
                      {PLAN_LABELS[s.plan?.toLowerCase()] || s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-green-500">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {s.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {formatDate(s.subscriptionStartDate)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {formatDate(s.subscriptionEndDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                    {maskId(s.stripeSubscriptionId)}
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No active subscriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "expired" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expired</th>
                <th className="px-4 py-3">Stripe Sub ID</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {expired.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]"
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {PLAN_LABELS[s.plan?.toLowerCase()] || s.plan}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-red-500">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      {s.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {formatDate(s.subscriptionEndDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                    {maskId(s.stripeSubscriptionId)}
                  </td>
                  <td className="px-4 py-3">
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                      >
                        Contact
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {expired.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No expired subscriptions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "onetime" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Employer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {oneTime.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]"
                >
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{p.employer}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{p.paymentType}</td>
                  <td className="px-4 py-3">
                    {p.amount ? `$${p.amount.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {formatDate(p.paidAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {oneTime.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No one-time payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
