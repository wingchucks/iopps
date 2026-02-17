"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

interface DashboardCounts {
  totalMembers: number;
  totalOrgs: number;
  verifiedOrgs: number;
  pendingOrgs: number;
  activeJobs: number;
  activeEvents: number;
  activeScholarships: number;
  activePrograms: number;
  pendingModeration: number;
  revenueMonth: number;
  revenueYear: number;
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setCounts(await res.json());
      } catch (e) {
        console.error("Failed to load counts", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  const stats = [
    { label: "Total Members", value: counts?.totalMembers ?? 0, color: "var(--accent)" },
    { label: "Organizations", value: counts?.totalOrgs ?? 0, sub: `${counts?.verifiedOrgs ?? 0} verified / ${counts?.pendingOrgs ?? 0} pending`, color: "var(--info)" },
    { label: "Active Jobs", value: counts?.activeJobs ?? 0, color: "var(--success)" },
    { label: "Active Events", value: counts?.activeEvents ?? 0, color: "var(--warning)" },
    { label: "Active Scholarships", value: counts?.activeScholarships ?? 0, color: "var(--gold)" },
    { label: "Active Programs", value: counts?.activePrograms ?? 0, color: "var(--teal)" },
    { label: "Pending Moderation", value: counts?.pendingModeration ?? 0, color: "var(--danger)" },
    { label: "Revenue (Month)", value: `$${((counts?.revenueMonth ?? 0) / 100).toLocaleString()}`, color: "var(--success)" },
    { label: "Revenue (Year)", value: `$${((counts?.revenueYear ?? 0) / 100).toLocaleString()}`, color: "var(--success)" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
            <div className="text-sm text-[var(--text-secondary)]">{s.label}</div>
            <div className="text-3xl font-bold mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
            {s.sub && <div className="text-xs text-[var(--text-muted)] mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
