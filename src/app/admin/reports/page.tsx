"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ReportData {
  totalUsers: number;
  newThisMonth: number;
  activeEmployers: number;
  totalJobs: number;
  growth: { month: string; count: number }[];
  topJobs: { id: string; title: string; views: number; applications: number }[];
  topEvents: { id: string; title: string; engagement: number }[];
  nations: { name: string; count: number }[];
  treaties: { name: string; count: number }[];
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/reports", {
          headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
        });
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="mx-auto max-w-6xl space-y-6"><p className="text-[var(--text-muted)]">Loading reports...</p></div>;
  if (!data) return <div className="mx-auto max-w-6xl space-y-6"><p className="text-red-400">Failed to load data.</p></div>;

  const maxGrowth = Math.max(...data.growth.map((g) => g.count), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
        <div className="flex gap-2">
          <a
            href="/api/admin/reports/export?type=users"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
          >
            Export Users CSV
          </a>
          <a
            href="/api/admin/reports/export?type=jobs"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
          >
            Export Jobs CSV
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="New This Month" value={data.newThisMonth} />
        <StatCard label="Active Employers" value={data.activeEmployers} />
        <StatCard label="Total Jobs Posted" value={data.totalJobs} />
      </div>

      {/* User Growth Bar Chart */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-lg font-semibold">User Signups (Last 6 Months)</h2>
        <div className="flex items-end gap-3 h-48">
          {data.growth.map((g) => (
            <div key={g.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-[var(--text-muted)]">{g.count}</span>
              <div
                className="w-full rounded-t bg-blue-500 transition-all"
                style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: 4 }}
              />
              <span className="text-xs text-[var(--text-secondary)]">{g.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Top Jobs by Views</h2>
          {data.topJobs.map((j, i) => (
            <div key={j.id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
                {j.title}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap ml-2">{j.views} views · {j.applications} apps</span>
            </div>
          ))}
          {data.topJobs.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Top Events by Engagement</h2>
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
          <h2 className="text-lg font-semibold">Users by Nation (Top 10)</h2>
          {data.nations.map((n) => (
            <div key={n.name} className="flex items-center justify-between text-sm">
              <span>{n.name}</span>
              <span className="text-[var(--text-muted)]">{n.count}</span>
            </div>
          ))}
          {data.nations.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Treaty Area Distribution</h2>
          {data.treaties.map((t) => {
            const maxT = Math.max(...data.treaties.map((x) => x.count), 1);
            return (
              <div key={t.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="text-[var(--text-muted)]">{t.count}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(t.count / maxT) * 100}%` }} />
                </div>
              </div>
            );
          })}
          {data.treaties.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet.</p>}
        </div>
      </div>
    </div>
  );
}
