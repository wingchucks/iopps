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
  monthlyRevenue: null;
  totalRevenue: null;
  growthPercent: null;
  activePlanRecords: number;
  trialPlanRecords: number;
  linkedPlanRecords: number;
  otherPlanRecords: number;
  oneTimePaymentRecords: number;
  schoolProgramPaymentRecords: number | null;
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
      { label: "Active plans / trials", value: "active", count: active.length },
      { label: "Other statuses", value: "expired", count: expired.length },
      { label: "Job payment metadata", value: "onetime", count: oneTime.length },
      { label: "School program", value: "school-program", count: schoolProgram.length },
    ],
    [active.length, expired.length, oneTime.length, schoolProgram.length],
  );

  const statItems = [
    { label: "Verified cash revenue", value: "Unavailable", helper: "No reconciled payment receipt totals are connected to this report." },
    { label: "Verified MRR", value: "Unavailable", helper: "Stored plan assignments do not establish recurring paid revenue." },
    { label: "Active plan records", value: summary?.activePlanRecords ?? "Unavailable", helper: "Employer records marked active; not verified paying customers." },
    { label: "Trial plan records", value: summary?.trialPlanRecords ?? "Unavailable", helper: "Trial entitlements; not cash revenue." },
  ];
  const secondaryStats = [
    { label: "Other plan records", value: summary?.otherPlanRecords ?? "Unavailable", classes: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground", helper: "Other stored statuses, including unknown; not necessarily expired." },
    { label: "Stripe-linked plan records", value: summary?.linkedPlanRecords ?? "Unavailable", classes: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground", helper: "Active/trial records with a subscription ID; linkage is not payment verification." },
    { label: "Job payment metadata records", value: summary?.oneTimePaymentRecords ?? "Unavailable", classes: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground", helper: "Loaded from up to 200 job records with payment metadata; not a complete receipt ledger." },
    { label: "School payment metadata records", value: summary?.schoolProgramPaymentRecords ?? "Unavailable", classes: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground", helper: "Up to 200 stored records; amounts and payment status are unverified." },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Plan & Payment Records"
        description="Stored employer plan assignments and payment metadata. Records may duplicate an organization and do not establish paid customers, cash receipts or month-over-month growth."
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
              title="Active plans and trials"
              description="Employer entitlement records marked active or trialing. Neither status nor a Stripe ID verifies billing or a payment receipt."
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
                          title="No active or trial plan records"
                          description="No active or trial employer plan records were found."
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
              title="Other plan statuses"
              description="Stored plan records outside active/trialing, including unknown statuses. Do not infer expiry or billing failure from this grouping."
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
                          title="No other plan records"
                          description="No employer plan records outside active/trialing were found."
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
              title="Job payment metadata"
              description="Payment fields on up to 200 job records, not reconciled receipts. Missing amounts and statuses remain unknown."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3">Employer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Stored amount</th>
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
                        {payment.amount === null ? "Unavailable" : `$${payment.amount.toLocaleString()}`}
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
                          title="No job payment metadata records"
                          description="No matching records were loaded. This does not establish zero paid purchases."
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
              title="School payment metadata"
              description="Up to 200 stored school payment records. Amounts and statuses are unverified; missing amounts remain unavailable."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <th className="px-4 py-3">Student / Participant</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Stored amount</th>
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
                        {payment.amount === null ? "Unavailable" : `$${payment.amount.toLocaleString()}`}
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
                          title={summary?.schoolProgramPaymentRecords === null ? "School records unavailable" : "No school payment metadata records"}
                          description="No receipt totals can be inferred from this table."
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
