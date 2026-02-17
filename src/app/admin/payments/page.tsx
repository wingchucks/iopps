"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageSkeleton from "@/components/PageSkeleton";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Subscription } from "@/lib/firestore/subscriptions";

export default function AdminPaymentsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PaymentsDashboard />
      </div>
    </ProtectedRoute>
  );
}

function PaymentsDashboard() {
  const [subs, setSubs] = useState<(Subscription & { orgName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const q = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subscription & { orgName?: string });
      setSubs(data);
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageSkeleton variant="grid" />;

  const now = new Date();
  const thisMonth = subs.filter((s) => {
    if (!s.createdAt) return false;
    const d = new Date((s.createdAt as { seconds: number }).seconds * 1000);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisYear = subs.filter((s) => {
    if (!s.createdAt) return false;
    const d = new Date((s.createdAt as { seconds: number }).seconds * 1000);
    return d.getFullYear() === now.getFullYear();
  });

  const monthRevenue = thisMonth.reduce((sum, s) => sum + (s.totalAmount || s.amount || 0), 0);
  const yearRevenue = thisYear.reduce((sum, s) => sum + (s.totalAmount || s.amount || 0), 0);
  const totalRevenue = subs.reduce((sum, s) => sum + (s.totalAmount || s.amount || 0), 0);
  const activeSubs = subs.filter((s) => s.status === "active");

  const statusColor = (st: string) => {
    if (st === "active") return "#22C55E";
    if (st === "pending") return "#F59E0B";
    return "#EF4444";
  };

  // Plan breakdown
  const planCounts: Record<string, number> = {};
  subs.forEach((s) => {
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
  });
  const maxPlanCount = Math.max(...Object.values(planCounts), 1);

  const formatDate = (ts: unknown) => {
    if (!ts) return "\u2014";
    const seconds = (ts as { seconds: number }).seconds;
    if (!seconds) return "\u2014";
    return new Date(seconds * 1000).toLocaleDateString();
  };

  const formatCurrency = (n: number) =>
    "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link href="/admin" className="text-sm text-text-sec hover:underline mb-4 block">
        &larr; Back to Admin
      </Link>
      <h2 className="text-2xl font-extrabold text-text mb-5">Payments &amp; Revenue</h2>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {[
          { label: "This Month", value: formatCurrency(monthRevenue) },
          { label: "This Year", value: formatCurrency(yearRevenue) },
          { label: "Total Revenue", value: formatCurrency(totalRevenue) },
          { label: "Active Subscriptions", value: String(activeSubs.length) },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <p className="text-2xl font-extrabold text-text">{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Subscriptions Table */}
      <Card className="mb-6" style={{ padding: 0 }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold text-text">Subscriptions</h3>
        </div>
        {subs.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted" style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Start</th>
                  <th className="px-3 py-3 font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s, i) => (
                  <tr
                    key={s.id}
                    className="text-text"
                    style={{
                      background: i % 2 === 0 ? "transparent" : "var(--bg)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-5 py-3 font-medium">{s.orgName || s.orgId}</td>
                    <td className="px-3 py-3 capitalize">{s.plan}</td>
                    <td className="px-3 py-3">
                      <Badge text={s.status} color={statusColor(s.status)} small />
                    </td>
                    <td className="px-3 py-3">{formatCurrency(s.totalAmount || s.amount || 0)}</td>
                    <td className="px-3 py-3 text-text-muted">{formatDate(s.createdAt)}</td>
                    <td className="px-3 py-3 text-text-muted">{formatDate(s.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="mb-6" style={{ padding: 0 }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold text-text">Recent Transactions</h3>
        </div>
        {subs.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No transactions yet.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {subs.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text">
                    {s.orgName || s.orgId} &mdash; {s.plan}
                  </p>
                  <p className="text-xs text-text-muted">{formatDate(s.createdAt)}</p>
                </div>
                <p className="text-sm font-semibold text-text">
                  {formatCurrency(s.totalAmount || s.amount || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Plan Breakdown */}
      {Object.keys(planCounts).length > 0 && (
        <Card style={{ padding: 20 }}>
          <h3 className="text-base font-bold text-text mb-4">Plan Breakdown</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(planCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text capitalize">{plan}</span>
                    <span className="text-text-muted">{count}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(count / maxPlanCount) * 100}%`,
                        background: "var(--navy)",
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
