"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminFilterTabs,
  AdminPageHeader,
  AdminStatGrid,
  type AdminFilterOption,
} from "@/components/admin";
import { formatDate } from "@/lib/format-date";
import { PLAN_TIER_COLORS, PLAN_TIER_LABELS, normalizePaidTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

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

function maskId(id: string | null): string {
  if (!id) return "--";
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}****${id.slice(-4)}`;
}

function getPlanPresentation(plan: string): { label: string; color: string } {
  const normalized = normalizePaidTier(plan);
  if (!normalized) {
    return {
      label: plan || "Unknown",
      color: "bg-success/10 text-success",
    };
  }

  return {
    label: PLAN_TIER_LABELS[normalized],
    color: PLAN_TIER_COLORS[normalized],
  };
}

function TableShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="border-b border-[var(--card-border)] px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      {children}
    </div>
  );
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
    const currentUser = user;
    if (!currentUser) return;

    (async () => {
      try {
        const token = await currentUser!.getIdToken();
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
      "_self",
    );
  };

  const tabs = useMemo<AdminFilterOption[]>(
    () => [
      { label: "Active subscriptions", value: "active", count: active.length },
      { label: "Expired", value: "expired", count: expired.length },
      { label: "One-time", value: "onetime", count: oneTime.length },
      { label: "School program", value: "school-program", count: schoolProgram.length },
    ],
    [active.length, expired.length, oneTime.length, schoolProgram.length],
  );

  const statItems = [
    {
      label: "MRR",
      value: `$${(summary?.monthlyRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`,
      helper: "Recurring subscription revenue this month",
      tone: "success" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: "Total revenue",
      value: `$${(summary?.totalRevenue ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`,
      helper: "Subscriptions plus one-time payments",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      label: "Growth",
      value:
        summary?.growthPercent !== undefined
          ? `${summary.growthPercent >= 0 ? "+" : ""}${summary.growthPercent.toFixed(1)}%`
          : "--",
      helper: "Month-over-month trend",
      tone: (summary?.growthPercent ?? 0) >= 0 ? ("success" as const) : ("danger" as const),
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 15l-6-6-6 6" />
        </svg>
      ),
    },
    {
      label: "Active subscriptions",
      value: summary?.activeSubscriptions ?? 0,
      helper: "Currently paying subscription accounts",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const secondaryStats = [
    {
      label: "Expired / lapsed",
      value: summary?.expiredSubscriptions ?? 0,
      classes: "border-error/20 bg-error/5 text-error",
      helper: "Accounts to follow up for renewal",
    },
    {
      label: "One-time payments",
      value: summary?.oneTimePayments ?? 0,
      classes: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground",
      helper: "Completed non-subscription payments",
    },
    {
      label: "School program revenue",
      value: `$${(summary?.schoolProgramRevenue ?? 0).toLocaleString("en-CA")}`,
      classes: "border-warning/20 bg-warning/5 text-warning",
      helper: `${summary?.schoolProgramPayments ?? 0} payments at the school-program rate`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Payments & Revenue"
        description="Track subscription health, inspect one-time purchases, and follow up on expired accounts without leaving the admin area."
      />

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] skeleton" />
          ))}
        </div>
      ) : (
        <>
          <AdminStatGrid items={statItems} />

          <div className="grid gap-4 md:grid-cols-3">
            {secondaryStats.map((stat) => (
              <div key={stat.label} className={cn("rounded-2xl border p-4", stat.classes)}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{stat.helper}</p>
              </div>
            ))}
          </div>

          <AdminFilterBar>
            <AdminFilterTabs
              options={tabs}
              value={tab}
              onChange={(value) => setTab(value as Tab)}
            />
          </AdminFilterBar>

          {tab === "active" && (
            <TableShell
              title="Active subscriptions"
              description="Current annual plans that are billing successfully."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Stripe Sub ID</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((subscription) => {
                    const presentation = getPlanPresentation(subscription.plan);
                    return (
                      <tr
                        key={subscription.id}
                        className={cn(
                          "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--muted)]",
                          normalizePaidTier(subscription.plan) === "school" && "bg-warning/5",
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{subscription.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", presentation.color)}>
                            {presentation.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            {subscription.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {formatDate(subscription.subscriptionStartDate)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {formatDate(subscription.subscriptionEndDate)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                          {maskId(subscription.stripeSubscriptionId)}
                        </td>
                      </tr>
                    );
                  })}
                  {active.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <AdminEmptyState
                          title="No active subscriptions"
                          description="There are currently no active subscription records to display."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          )}

          {tab === "expired" && (
            <TableShell
              title="Expired subscriptions"
              description="Lapsed accounts that may need a renewal follow-up."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expired</th>
                    <th className="px-4 py-3">Stripe Sub ID</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expired.map((subscription) => {
                    const endDate = subscription.subscriptionEndDate
                      ? new Date(subscription.subscriptionEndDate)
                      : null;
                    const daysSince = endDate
                      ? Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const isCritical = daysSince > 90;
                    const isRecent = daysSince <= 30;

                    return (
                      <tr
                        key={subscription.id}
                        className={cn(
                          "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--muted)]",
                          isCritical && "bg-error/5",
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{subscription.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {getPlanPresentation(subscription.plan).label}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              isCritical ? "text-error" : isRecent ? "text-warning" : "text-error",
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isCritical ? "bg-error" : isRecent ? "bg-warning" : "bg-error",
                              )}
                            />
                            {subscription.subscriptionStatus}
                            {isCritical && (
                              <span className="rounded bg-error/15 px-1.5 py-0.5 text-[10px] font-bold text-error">
                                {daysSince}d
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-error">
                          {formatDate(subscription.subscriptionEndDate)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                          {maskId(subscription.stripeSubscriptionId)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleContact(subscription.email, subscription.name)}
                            className="rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
                          >
                            Contact
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {expired.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <AdminEmptyState
                          title="No expired subscriptions"
                          description="All tracked subscriptions are currently active."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          )}

          {tab === "onetime" && (
            <TableShell
              title="One-time payments"
              description="Completed standalone purchases such as job posts."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3">Employer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {oneTime.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--muted)]"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{payment.title}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{payment.employer}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{payment.paymentType}</td>
                      <td className="px-4 py-3 text-foreground">
                        {payment.amount ? `$${payment.amount.toLocaleString()}` : "--"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(payment.paidAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {oneTime.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <AdminEmptyState
                          title="No one-time payments"
                          description="No completed standalone payments were found."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          )}

          {tab === "school-program" && (
            <TableShell
              title="School program payments"
              description="Program-level payments from schools and participants."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Student / Participant</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolProgram.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--muted)]"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{payment.title}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{payment.employer}</td>
                      <td className="px-4 py-3 font-medium text-warning">
                        ${(payment.amount ?? 50).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(payment.paidAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {schoolProgram.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8">
                        <AdminEmptyState
                          title="No school program payments"
                          description="There are no school program payments to show right now."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          )}
        </>
      )}
    </div>
  );
}
