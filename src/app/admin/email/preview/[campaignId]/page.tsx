"use client";

import { useEffect, useState, useRef, use } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";
import toast from "react-hot-toast";
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

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewsletterPreviewPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Fetch campaign data and rendered preview
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const token = await user.getIdToken();

        // Fetch campaign details
        const campaignRes = await fetch(`/api/admin/email/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!campaignRes.ok) throw new Error("Failed to fetch campaign");
        const campaignData: Campaign = await campaignRes.json();
        setCampaign(campaignData);

        // Fetch rendered preview HTML
        const previewRes = await fetch("/api/admin/email/preview", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: campaignData.subject,
            emailBody: campaignData.body,
          }),
        });

        if (previewRes.ok) {
          const { html } = await previewRes.json();
          setPreviewHtml(html);
        } else {
          // Fallback: use raw body
          setPreviewHtml(campaignData.body || "<p>No content</p>");
        }
      } catch {
        toast.error("Failed to load campaign preview");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, campaignId]);

  // Write preview HTML into iframe
  useEffect(() => {
    if (!previewHtml || !iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(previewHtml);
      doc.close();
    }
  }, [previewHtml, viewMode]);

  const handleSendTest = async () => {
    if (!user || !campaign) return;

    setSendingTest(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: campaign.subject,
          audience: campaign.audience,
          body: campaign.body,
          isTest: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to send test");
      const data = await res.json();
      toast.success(data.message || "Test email sent");
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Not found
  if (!campaign) {
    return (
      <div className="mx-auto max-w-6xl py-24 text-center text-[var(--text-muted)]">
        Campaign not found
      </div>
    );
  }

  const statusLabel = campaign.status;
  const statusColor =
    statusLabel === "sent"
      ? "bg-emerald-500/10 text-emerald-500"
      : statusLabel === "scheduled"
      ? "bg-amber-500/10 text-amber-500"
      : "bg-gray-500/10 text-gray-400";

  const recipientCount = campaign.stats.sent;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/email/${campaignId}`}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Newsletter Preview</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Preview how the email will appear to recipients
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendTest}
            disabled={sendingTest}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
            {sendingTest ? "Sending..." : "Send Test Email"}
          </button>
          <Link
            href={`/admin/email/${campaignId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Back to Campaign
          </Link>
        </div>
      </div>

      {/* Campaign Metadata */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Subject: </span>
            <span className="font-medium">{campaign.subject}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Audience: </span>
            <span className="font-medium capitalize">{campaign.audience}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Recipients: </span>
            <span className="font-medium">{recipientCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Status: </span>
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusColor)}>
              {statusLabel}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Date: </span>
            <span className="font-medium">
              {campaign.sentAt
                ? formatDateTime(campaign.sentAt)
                : campaign.scheduledAt
                ? formatDateTime(campaign.scheduledAt)
                : formatDateTime(campaign.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Viewport Toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1 w-fit">
        <button
          onClick={() => setViewMode("desktop")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "desktop"
              ? "bg-accent text-white"
              : "text-[var(--text-muted)] hover:text-foreground"
          )}
        >
          <MonitorIcon className="h-4 w-4" />
          Desktop
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "mobile"
              ? "bg-accent text-white"
              : "text-[var(--text-muted)] hover:text-foreground"
          )}
        >
          <SmartphoneIcon className="h-4 w-4" />
          Mobile
        </button>
      </div>

      {/* Email Preview */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "overflow-hidden rounded-lg border border-[var(--card-border)] bg-white transition-all duration-300",
              viewMode === "desktop" ? "w-full" : "w-[375px]"
            )}
          >
            {/* Faux browser bar */}
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 rounded bg-gray-200 px-3 py-1 text-center text-xs text-gray-500">
                {campaign.subject}
              </div>
            </div>

            {/* Iframe */}
            <iframe
              ref={iframeRef}
              title="Email Preview"
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
