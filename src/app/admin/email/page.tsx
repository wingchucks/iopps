"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  status: "draft" | "scheduled" | "sent";
  type?: string;
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Draft", value: "draft" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/email/campaigns?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setSubscriberCount(data.subscriberCount || 0);
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [user, tab]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const sentCampaigns = campaigns.filter((c) => c.status === "sent");
  const avgOpenRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + (c.stats.sent > 0 ? (c.stats.opened / c.stats.sent) * 100 : 0), 0) / sentCampaigns.length
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage email broadcasts and newsletters</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/email/templates"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Templates
          </Link>
          <Link
            href="/admin/email/compose"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <PlusIcon className="h-4 w-4" />
            Create Broadcast
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Subscribers</p>
          <p className="text-2xl font-bold">{subscriberCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Campaigns Sent</p>
          <p className="text-2xl font-bold">{sentCampaigns.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Avg Open Rate</p>
          <p className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.value ? "bg-accent text-white" : "text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <MailIcon className="mb-3 h-10 w-10 opacity-40" />
            <p>No campaigns found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs text-[var(--text-muted)]">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Open Rate</th>
                <th className="px-4 py-3 font-medium text-right">Click Rate</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const openRate = c.stats.sent > 0 ? ((c.stats.opened / c.stats.sent) * 100).toFixed(1) : "—";
                const clickRate = c.stats.sent > 0 ? ((c.stats.clicked / c.stats.sent) * 100).toFixed(1) : "—";
                return (
                  <tr key={c.id} className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/email/${c.id}`} className="font-medium text-accent hover:underline">
                        {c.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{c.audience}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          c.status === "sent" && "bg-emerald-500/10 text-emerald-500",
                          c.status === "scheduled" && "bg-amber-500/10 text-amber-500",
                          c.status === "draft" && "bg-gray-500/10 text-gray-400"
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{openRate}{openRate !== "—" && "%"}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{clickRate}{clickRate !== "—" && "%"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
