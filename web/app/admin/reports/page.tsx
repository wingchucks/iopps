"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

interface ReportData {
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  newOrgsThisMonth: number;
  topViewedPosts: { id: string; title: string; type: string; views: number }[];
  applicationsByMonth: { month: string; count: number }[];
  postsByType: Record<string, number>;
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts?include=reports", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse">Loading reports...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics & Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
          <div className="text-sm text-[var(--text-secondary)]">New Users (This Month)</div>
          <div className="text-3xl font-bold mt-1">{data?.newUsersThisMonth ?? 0}</div>
          <div className="text-xs text-[var(--text-muted)]">Last month: {data?.newUsersLastMonth ?? 0}</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
          <div className="text-sm text-[var(--text-secondary)]">New Orgs (This Month)</div>
          <div className="text-3xl font-bold mt-1">{data?.newOrgsThisMonth ?? 0}</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
          <div className="text-sm text-[var(--text-secondary)]">Posts by Type</div>
          <div className="mt-2 space-y-1">
            {Object.entries(data?.postsByType ?? {}).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="capitalize">{type}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Top Viewed Posts</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Views</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topViewedPosts || []).map((p) => (
              <tr key={p.id} className="border-b border-[var(--card-border)]">
                <td className="p-3">{p.title}</td>
                <td className="p-3"><span className="badge-education">{p.type}</span></td>
                <td className="p-3 font-medium">{p.views.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
