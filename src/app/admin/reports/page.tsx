"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportData {
  totalUsers: number;
  newThisMonth: number;
  activeEmployers: number;
  totalJobs: number;
  userGrowth: { month: string; count: number }[];
  employerGrowth: { month: string; count: number }[];
  applicationsCount: number;
  savedJobsCount: number;
  topJobs: { id: string; title: string; views: number; applications: number }[];
  topEvents: { id: string; title: string; engagement: number }[];
  topNations: { name: string; count: number }[];
  treatyAreas: { name: string; count: number }[];
  revenue: {
    subscriptionRevenue: number;
    oneTimePayments: number;
    activeSubscriptions: number;
  };
}

type RangeOption = "7" | "30" | "90" | "all";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5",
      accent && "border-amber-600/30"
    )}>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold", accent && "text-amber-500")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function BarChart({ data, color, title }: { data: { label: string; count: number }[]; color: string; title: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-end gap-1 h-40">
        {data.map((item) => (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-[var(--text-muted)]">{item.count}</span>
            <div
              className={`w-full rounded-t ${color}`}
              style={{ height: `${(item.count / max) * 100}%`, minHeight: item.count > 0 ? "4px" : "0" }}
            />
            <span className="text-xs text-[var(--text-muted)] truncate w-full text-center">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--text-muted)]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${(value / max) * 100}%`, minWidth: value > 0 ? "4px" : "0" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export Dropdown                                                     */
/* ------------------------------------------------------------------ */

function ExportDropdown({ token }: { token: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportTypes = [
    { label: "Users", type: "users" },
    { label: "Employers", type: "employers" },
    { label: "Jobs", type: "jobs" },
    { label: "Applications", type: "applications" },
  ];

  async function handleExport(type: string) {
    setOpen(false);
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    try {
      const res = await fetch(`/api/admin/reports/export?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type} CSV exported`);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
      >
        {/* Download icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export CSV
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-lg">
          {exportTypes.map((item) => (
            <button
              key={item.type}
              onClick={() => handleExport(item.type)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Range selector pills                                               */
/* ------------------------------------------------------------------ */

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "90 Days", value: "90" },
  { label: "All Time", value: "all" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeOption>("30");
  const [token, setToken] = useState<string | null>(null);

  const fetchData = useCallback(async (r: RangeOption) => {
    if (!user) return;
    setLoading(true);
    try {
      const t = await user.getIdToken();
      setToken(t);
      const res = await fetch(`/api/admin/reports?range=${r}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(range);
  }, [fetchData, range]);

  function handleRangeChange(r: RangeOption) {
    setRange(r);
  }

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-32 animate-pulse rounded bg-white/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />
          ))}
        </div>
        <div className="h-52 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-red-400">Failed to load data.</p>
      </div>
    );
  }

  const maxNation = Math.max(...data.topNations.map((n) => n.count), 1);
  const maxTreaty = Math.max(...data.treatyAreas.map((t) => t.count), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
        <div className="flex items-center gap-3">
          {/* Date range pills */}
          <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRangeChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition",
                  range === opt.value
                    ? "bg-amber-600 text-white"
                    : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-white/5"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <ExportDropdown token={token} />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="New This Month" value={data.newThisMonth} accent />
        <StatCard label="Active Employers" value={data.activeEmployers} />
        <StatCard label="Total Jobs" value={data.totalJobs} />
      </div>

      {/* Growth Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="User Signups"
          data={data.userGrowth.map((g) => ({ label: g.month, count: g.count }))}
          color="bg-blue-500"
        />
        <BarChart
          title="Employer Registrations"
          data={data.employerGrowth.map((g) => ({ label: g.month, count: g.count }))}
          color="bg-amber-500"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 3H8l-2 4h12l-2-4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Job Applications</p>
            <p className="text-2xl font-bold">{data.applicationsCount.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Saved Jobs</p>
            <p className="text-2xl font-bold">{data.savedJobsCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Content Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Top 5 Jobs by Views</h2>
          {data.topJobs.map((j, i) => (
            <div key={j.id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
                {j.title}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap ml-2">
                {j.views} views &middot; {j.applications} apps
              </span>
            </div>
          ))}
          {data.topJobs.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Top 5 Events</h2>
          {data.topEvents.map((e, i) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
                {e.title}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap ml-2">{e.engagement} interactions</span>
            </div>
          ))}
          {data.topEvents.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>
      </div>

      {/* Demographics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Top 10 Nations</h2>
          {data.topNations.map((n) => (
            <HorizontalBar key={n.name} label={n.name} value={n.count} max={maxNation} color="bg-teal-500" />
          ))}
          {data.topNations.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Treaty Area Distribution</h2>
          {data.treatyAreas.map((t) => (
            <HorizontalBar key={t.name} label={t.name} value={t.count} max={maxTreaty} color="bg-emerald-500" />
          ))}
          {data.treatyAreas.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">Revenue Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-4">
            <p className="text-sm text-[var(--text-muted)]">Subscription Revenue</p>
            <p className="mt-1 text-2xl font-bold text-green-400">
              ${data.revenue.subscriptionRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-4">
            <p className="text-sm text-[var(--text-muted)]">One-Time Payments</p>
            <p className="mt-1 text-2xl font-bold text-green-400">
              ${data.revenue.oneTimePayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-4">
            <p className="text-sm text-[var(--text-muted)]">Active Subscriptions</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">
              {data.revenue.activeSubscriptions.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
