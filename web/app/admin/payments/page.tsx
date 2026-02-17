"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

interface PaymentData {
  revenueMonth: number;
  revenueYear: number;
  revenueAllTime: number;
  activeSubscriptions: { orgId: string; orgName: string; tier: string; currentPeriodEnd: string }[];
  recentPayments: { id: string; orgName: string; amount: number; date: string; type: string }[];
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts?include=payments", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse">Loading payments...</div>;

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments & Revenue</h1>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-[#635bff] text-white rounded-lg text-sm font-medium hover:bg-[#5851db]">
          Open Stripe Dashboard →
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "This Month", value: fmt(data?.revenueMonth ?? 0) },
          { label: "This Year", value: fmt(data?.revenueYear ?? 0) },
          { label: "All Time", value: fmt(data?.revenueAllTime ?? 0) },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
            <div className="text-sm text-[var(--text-secondary)]">{s.label}</div>
            <div className="text-3xl font-bold text-[var(--success)] mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">Active Subscriptions</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Organization</th>
              <th className="p-3 font-medium">Tier</th>
              <th className="p-3 font-medium">Renews</th>
            </tr>
          </thead>
          <tbody>
            {(data?.activeSubscriptions || []).map((s) => (
              <tr key={s.orgId} className="border-b border-[var(--card-border)]">
                <td className="p-3">{s.orgName}</td>
                <td className="p-3"><span className="badge-premium">{s.tier}</span></td>
                <td className="p-3 text-[var(--text-secondary)]">{s.currentPeriodEnd}</td>
              </tr>
            ))}
            {!data?.activeSubscriptions?.length && (
              <tr><td colSpan={3} className="p-8 text-center text-[var(--text-muted)]">No active subscriptions</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent Payments</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Organization</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentPayments || []).map((p) => (
              <tr key={p.id} className="border-b border-[var(--card-border)]">
                <td className="p-3">{p.orgName}</td>
                <td className="p-3 font-medium">{fmt(p.amount)}</td>
                <td className="p-3 text-[var(--text-secondary)]">{p.type}</td>
                <td className="p-3 text-[var(--text-muted)]">{p.date}</td>
              </tr>
            ))}
            {!data?.recentPayments?.length && (
              <tr><td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No recent payments</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
