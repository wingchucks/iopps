"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
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
  totalRevenue: number;
  growthPercent: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  oneTimePayments: number;
  schoolProgramPayments: number;
  schoolProgramRevenue: number;
}

type Tab = "active" | "expired" | "onetime" | "school-program";

const PLAN_LABELS: Record<string, string> = {
  essential: "Essential -- $1,250/yr",
  professional: "Professional -- $2,500/yr",
  school: "School Tier -- $5,500/yr",
};

const PLAN_COLORS: Record<string, string> = {
  school: "bg-amber-500/15 text-amber-600",
  professional: "bg-blue-500/15 text-blue-500",
  essential: "bg-green-500/15 text-green-600",
};

function maskId(id: string | null): string {
  if (!id) return "--";
  if (id.length <= 8) return id;
  return id.slice(0, 4) + "****" + id.slice(-4);
}


export default function PaymentsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [active, setActive] = useState<Subscription[]>([]);
  const [expired, setExpired] = useState<Subscription[]>([]);
  const [oneTime, setOneTime] = useState<OneTimePayment[]>([]);
  const [schoolProgram, setSchoolProgram] = useState<OneTimePayment[]>([]);
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
        setSchoolProgram(data.schoolProgram || []);
      } catch {
        toast.error("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleContact = (email: string | null, name: string) => {
    if (!email) {
      toast.error("No email address on file");
      return;
    }
    window.open(
      `mailto:${email}?subject=IOPPS Subscription Renewal&body=Hi ${name},%0D%0A%0D%0AWe noticed your IOPPS subscription has expired. We would love to help you renew.%0D%0A%0D%0ABest regards,%0D%0AIOPPS Team`,
      "_self"
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: `Active Subs (${active.length})` },
    { key: "expired", label: `Expired (${expired.length})` },
    { key: "onetime", label: `One-Time (${oneTime.length})` },
    { key: "school-program", label: `School Program (${schoolProgram.length})` },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">Payments & Revenue</h1>
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Payments & Revenue</h1>

      {/* Revenue summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "MRR (Monthly Recurring)",
            value: `$${(summary?.monthlyRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`,
            color: "text-green-500",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            ),
          },
          {
            label: "Total Revenue",
            value: `$${(summary?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`,
            color: "text-accent",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            ),
          },
          {
            label: "Growth (MoM)",
            value: summary?.growthPercent !== undefined ? `${summary.growthPercent >= 0 ? "+" : ""}${summary.growthPercent.toFixed(1)}%` : "--",
            color: (summary?.growthPercent ?? 0) >= 0 ? "text-green-500" : "text-red-500",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={(summary?.growthPercent ?? 0) >= 0 ? "text-green-500" : "text-red-500"}>
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            ),
          },
          {
            label: "Active Subscriptions",
            value: summary?.activeSubscriptions ?? 0,
            color: "text-blue-500",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            ),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--card-border)] bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {card.label}
              </p>
              {card.icon}
            </div>
            <p className={cn("mt-2 text-2xl font-bold", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400">Expired / Lapsed</p>
          <p className="mt-1 text-xl font-bold text-red-500">{summary?.expiredSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">One-Time Payments</p>
          <p className="mt-1 text-xl font-bold text-[var(--text-muted)]">{summary?.oneTimePayments ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400">School Program ($50 ea)</p>
          <p className="mt-1 text-xl font-bold text-amber-500">
            {summary?.schoolProgramPayments ?? 0}
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              = ${((summary?.schoolProgramRevenue ?? 0)).toLocaleString()}
            </span>
          </p>
        </div>
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
                ? t.key === "expired"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-accent text-white"
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
                        PLAN_COLORS[s.plan?.toLowerCase()] || "bg-green-500/15 text-green-600"
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
              {expired.map((s) => {
                // Days since expiration for visual urgency
                const endDate = s.subscriptionEndDate ? new Date(s.subscriptionEndDate) : null;
                const daysSince = endDate ? Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                const isRecent = daysSince <= 30;
                const isCritical = daysSince > 90;

                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]",
                      isCritical && "bg-red-500/5"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {PLAN_LABELS[s.plan?.toLowerCase()] || s.plan}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5",
                        isCritical ? "text-red-600" : isRecent ? "text-amber-500" : "text-red-500"
                      )}>
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          isCritical ? "bg-red-600" : isRecent ? "bg-amber-500" : "bg-red-500"
                        )} />
                        {s.subscriptionStatus}
                        {isCritical && (
                          <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            {daysSince}d
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400">
                      {formatDate(s.subscriptionEndDate)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {maskId(s.stripeSubscriptionId)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleContact(s.email, s.name)}
                        className="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                      >
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Contact
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                    {p.amount ? `$${p.amount.toLocaleString()}` : "--"}
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

        {tab === "school-program" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Student / Participant</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {schoolProgram.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]"
                >
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{p.employer}</td>
                  <td className="px-4 py-3">
                    <span className="text-amber-500 font-medium">
                      ${(p.amount ?? 50).toLocaleString()}
                    </span>
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
              {schoolProgram.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No school program payments found
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
