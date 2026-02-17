"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";

const topStats = [
  { label: "Total Subscribers", value: "1,842", sub: "of 2,847 members", icon: "\u{1F4E7}" },
  { label: "Weekly Digest", value: "1,204", sub: "65% of subscribers", icon: "\u{1F4C5}" },
  { label: "Daily Digest", value: "389", sub: "21% of subscribers", icon: "\u{26A1}" },
  { label: "Avg Open Rate", value: "68%", sub: "Industry avg: 21%", icon: "\u{1F4C8}" },
];

const campaigns = [
  { subject: "SIGA Hiring Surge: 12 New Positions This Week", type: "Broadcast: Hiring Alert", sent: "Feb 14, 2026", audience: "Job Seekers in SK", total: 743, opened: 512, clicked: 198, rate: "69%" },
  { subject: "Your Weekly IOPPS Digest — Feb 10", type: "Weekly Digest (Automated)", sent: "Feb 10, 2026", audience: "Weekly subscribers", total: 1204, opened: 831, clicked: 342, rate: "69%" },
  { subject: "Back to Batoche Days — Early Registration Open", type: "Broadcast: Event Alert", sent: "Feb 7, 2026", audience: "All Members", total: 1842, opened: 1289, clicked: 467, rate: "70%" },
  { subject: "New Partner: Saskatchewan Polytechnic Joins IOPPS", type: "Broadcast: General", sent: "Feb 3, 2026", audience: "All Members", total: 1842, opened: 1198, clicked: 289, rate: "65%" },
  { subject: "Your Weekly IOPPS Digest — Feb 3", type: "Weekly Digest (Automated)", sent: "Feb 3, 2026", audience: "Weekly subscribers", total: 1189, opened: 808, clicked: 301, rate: "68%" },
];

export default function EmailCampaignsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <EmailCampaignsContent />
      </div>
    </ProtectedRoute>
  );
}

function EmailCampaignsContent() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-text mb-1">Email Campaigns</h2>
          <p className="text-sm text-text-sec m-0">
            Manage digests and broadcast emails to the community
          </p>
        </div>
        <Button primary style={{ fontSize: 14 }}>+ New Campaign</Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
        {topStats.map((s, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <span className="text-[22px]">{s.icon}</span>
            <p className="text-2xl font-extrabold text-text mt-1.5 mb-0.5">{s.value}</p>
            <p className="text-[13px] font-semibold text-text mb-0.5">{s.label}</p>
            <p className="text-[11px] text-text-muted m-0">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Recent Campaigns */}
      <h3 className="text-base font-bold text-text mb-3">Recent Campaigns</h3>
      <div className="flex flex-col gap-2.5">
        {campaigns.map((c, i) => (
          <Card key={i}>
            <div style={{ padding: "16px 20px" }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-text mb-1">{c.subject}</h4>
                  <div className="flex gap-2 items-center">
                    <Badge
                      text={c.type.includes("Digest") ? "Automated" : "Broadcast"}
                      color={c.type.includes("Digest") ? "var(--teal)" : "var(--gold)"}
                      bg={c.type.includes("Digest") ? "var(--teal-soft)" : "var(--gold-soft)"}
                      small
                    />
                    <span className="text-xs text-text-muted">{c.sent}</span>
                    <span className="text-xs text-text-muted">→ {c.audience}</span>
                  </div>
                </div>
                <Link
                  href="/admin/newsletter-preview"
                  className="no-underline px-3 py-1 rounded-lg text-xs font-semibold text-teal"
                  style={{ background: "var(--border)" }}
                >
                  Preview &#8599;
                </Link>
              </div>
              <div className="flex flex-wrap gap-4 md:gap-6 mt-2.5">
                {[
                  { label: "Sent", value: c.total.toLocaleString() },
                  { label: "Opened", value: c.opened.toLocaleString() },
                  { label: "Clicked", value: c.clicked.toLocaleString() },
                  { label: "Open Rate", value: c.rate },
                ].map((stat, j) => (
                  <div key={j}>
                    <p
                      className="text-base font-extrabold m-0"
                      style={{ color: j === 3 ? "var(--teal)" : "var(--text)" }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">{stat.label}</p>
                  </div>
                ))}
                {/* Mini progress bar */}
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: c.rate,
                        background: "linear-gradient(90deg, var(--teal), var(--teal-light))",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
