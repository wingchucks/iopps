"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminCounts {
  totalUsers: number;
  activeJobs: number;
  employers: number;
  pendingEmployers: number;
  conferences: number;
  scholarships: number;
  applications: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value, badge, badgeColor, delay = 0 }: StatCardProps) {
  return (
    <div
      className="animate-fade-up bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 transition-all duration-200 hover:border-[var(--card-border-hover)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {icon}
        </div>
        {badge && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              badgeColor || "bg-warning/10 text-warning"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons for stats
// ---------------------------------------------------------------------------

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6" />
      <line x1="12" y1="6" x2="12" y2="6" />
      <line x1="16" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchCounts() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/admin/counts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch counts (${res.status})`);
        }

        const data = await res.json();
        if (!cancelled) setCounts(data);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching admin counts:", err);
          setError("Unable to load platform statistics.");
        }
      }
    }

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats: StatCardProps[] = [
    {
      icon: <UsersIcon />,
      label: "Total Users",
      value: counts?.totalUsers ?? "\u2014",
      delay: 0,
    },
    {
      icon: <BriefcaseIcon />,
      label: "Active Jobs",
      value: counts?.activeJobs ?? "\u2014",
      delay: 80,
    },
    {
      icon: <BuildingIcon />,
      label: "Employers",
      value: counts?.employers ?? "\u2014",
      badge: counts?.pendingEmployers ? `${counts.pendingEmployers} pending` : undefined,
      badgeColor: "bg-warning/10 text-warning",
      delay: 160,
    },
    {
      icon: <CalendarIcon />,
      label: "Conferences",
      value: counts?.conferences ?? "\u2014",
      delay: 240,
    },
    {
      icon: <AwardIcon />,
      label: "Scholarships",
      value: counts?.scholarships ?? "\u2014",
      delay: 320,
    },
    {
      icon: <FileTextIcon />,
      label: "Applications",
      value: counts?.applications ?? "\u2014",
      delay: 400,
    },
  ];

  const quickActions = [
    { label: "Manage Employers", href: "/admin/employers" },
    { label: "Manage Jobs", href: "/admin/jobs" },
    { label: "View Analytics", href: "/admin/analytics" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ---- Header ---- */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Platform overview and moderation tools
        </p>
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* ---- KPI Stats Grid ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ---- Quick Actions ---- */}
      <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-accent hover:bg-accent/5"
            >
              {action.label}
              <ChevronRightIcon className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      </div>

      {/* ---- Pending Approvals ---- */}
      <div
        className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Pending Approvals
            </h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {counts?.pendingEmployers
                ? `${counts.pendingEmployers} employer${counts.pendingEmployers !== 1 ? "s" : ""} awaiting review`
                : "No pending employer approvals"}
            </p>
          </div>
          {counts?.pendingEmployers ? (
            <Link
              href="/admin/employers?status=pending"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Review
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* ---- Recent Activity Placeholder ---- */}
      <div
        className="animate-fade-in rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center"
        style={{ animationDelay: "400ms" }}
      >
        <p className="text-sm text-[var(--text-muted)]">
          Activity feed coming soon
        </p>
      </div>
    </div>
  );
}
