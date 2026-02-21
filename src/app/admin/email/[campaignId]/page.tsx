"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { formatDateTime } from "@/lib/format-date";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  body: string;
  status: string;
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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={`text-2xl font-bold ${color || ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate Bar
// ---------------------------------------------------------------------------

function RateBar({ label, rate }: { label: string; rate: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium">{rate.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/email/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setCampaign(data);
      } catch {
        toast.error("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, campaignId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-6xl py-24 text-center text-[var(--text-muted)]">
        Campaign not found
      </div>
    );
  }

  const s = campaign.stats;
  const openRate = s.sent > 0 ? (s.opened / s.sent) * 100 : 0;
  const clickRate = s.sent > 0 ? (s.clicked / s.sent) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/email" className="rounded-lg p-2 transition-colors hover:bg-muted">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{campaign.subject}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {campaign.status === "sent" && campaign.sentAt
                ? `Sent on ${formatDateTime(campaign.sentAt)}`
                : campaign.status === "scheduled" && campaign.scheduledAt
                ? `Scheduled for ${formatDateTime(campaign.scheduledAt)}`
                : `Draft — created ${formatDateTime(campaign.createdAt)}`}
              {" · "}
              <span className="capitalize">{campaign.audience}</span> audience
            </p>
          </div>
        </div>
        <Link
          href={`/admin/email/preview/${campaignId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Preview
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Sent" value={s.sent} />
        <StatCard label="Delivered" value={s.delivered} />
        <StatCard label="Opened" value={s.opened} color="text-emerald-500" />
        <StatCard label="Clicked" value={s.clicked} color="text-blue-500" />
        <StatCard label="Bounced" value={s.bounced} color="text-red-400" />
        <StatCard label="Unsubscribed" value={s.unsubscribed} color="text-amber-500" />
      </div>

      {/* Rate Bars */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <RateBar label="Open Rate" rate={openRate} />
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <RateBar label="Click Rate" rate={clickRate} />
        </div>
      </div>

      {/* Email Content Preview */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-3 text-lg font-semibold">Email Content</h2>
        {campaign.body ? (
          <div className="max-h-96 overflow-auto rounded-lg border border-[var(--card-border)] bg-white p-4 text-sm text-gray-800">
            <div dangerouslySetInnerHTML={{ __html: campaign.body }} />
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No content</p>
        )}
      </div>

      {/* Recipient Summary */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-2 text-lg font-semibold">Recipients</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          This campaign was sent to <strong>{s.sent.toLocaleString()}</strong> recipients
          in the <strong className="capitalize">{campaign.audience}</strong> audience.
          {s.bounced > 0 && ` ${s.bounced} emails bounced.`}
          {s.unsubscribed > 0 && ` ${s.unsubscribed} users unsubscribed.`}
        </p>
      </div>
    </div>
  );
}
