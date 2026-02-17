"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useParams } from "next/navigation";
import type { Campaign } from "@/lib/types";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/counts?include=campaign&campaignId=${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCampaign(data.campaign || null);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [campaignId]);

  if (loading) return <div className="animate-pulse">Loading...</div>;
  if (!campaign) return <div>Campaign not found</div>;

  const stats = [
    { label: "Total", value: campaign.stats.total },
    { label: "Delivered", value: campaign.stats.delivered },
    { label: "Bounced", value: campaign.stats.bounced },
    { label: "Opened", value: campaign.stats.opened },
    { label: "Clicked", value: campaign.stats.clicked },
    { label: "Unsubscribed", value: campaign.stats.unsubscribed },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{campaign.subject}</h1>
      <div className="flex items-center gap-2 mb-6">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          campaign.status === "sent" ? "bg-green-100 text-green-700" :
          campaign.status === "failed" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-600"
        }`}>{campaign.status}</span>
        <span className="text-sm text-[var(--text-muted)]">
          Audience: {campaign.audience.segment}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">Email Body</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6"
        dangerouslySetInnerHTML={{ __html: campaign.body }} />
    </div>
  );
}
