"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  EnvelopeIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface EmailStats {
  totalSubscribers: number;
  unsubscribedCount: number;
  jobAlertsEnabled: number;
  conferenceUpdatesEnabled: number;
  powwowUpdatesEnabled: number;
  shopUpdatesEnabled: number;
  weeklyDigestEnabled: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
  emailsSentThisMonth: number;
}

interface EmailLog {
  id: string;
  userId: string;
  userEmail: string;
  campaignType: string;
  subject: string;
  status: "sent" | "failed" | "bounced";
  sentAt: Timestamp;
  error?: string;
}

interface Campaign {
  id: string;
  subject: string;
  recipientFilter: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

type RecipientFilter = "all" | "job_seekers" | "employers" | "digest_subscribers";

export default function AdminEmailsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<EmailLog[]>([]);
  const [triggeringCampaign, setTriggeringCampaign] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Campaign builder state
  const [activeTab, setActiveTab] = useState<"dashboard" | "compose">("dashboard");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignContent, setCampaignContent] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [testEmail, setTestEmail] = useState("");
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ success: boolean; message: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !role) {
      router.push("/");
      return;
    }

    const isAuthorized = role === "admin" || role === "moderator";
    if (!isAuthorized) {
      router.push("/");
      return;
    }

    loadEmailStats();
    loadCampaigns();
  }, [user, role, authLoading, router]);

  async function loadEmailStats() {
    try {
      setLoading(true);

      // Get email preferences
      const prefsRef = collection(db!, "emailPreferences");
      const prefsSnap = await getDocs(prefsRef);
      const prefs = prefsSnap.docs.map((doc) => doc.data());

      const totalSubscribers = prefs.length;
      const unsubscribedCount = prefs.filter((p) => p.unsubscribedAll === true).length;
      const jobAlertsEnabled = prefs.filter((p) => p.jobAlertsEnabled === true && !p.unsubscribedAll).length;
      const conferenceUpdatesEnabled = prefs.filter((p) => p.conferenceUpdates === true && !p.unsubscribedAll).length;
      const powwowUpdatesEnabled = prefs.filter((p) => p.powwowUpdates === true && !p.unsubscribedAll).length;
      const shopUpdatesEnabled = prefs.filter((p) => p.shopUpdates === true && !p.unsubscribedAll).length;
      const weeklyDigestEnabled = prefs.filter((p) => p.weeklyDigest === true && !p.unsubscribedAll).length;

      // Get email logs for counts
      const logsRef = collection(db!, "emailLogs");
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const logsSnap = await getDocs(logsRef);
      const logs = logsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmailLog[];

      const emailsSentToday = logs.filter((log) => {
        const sentAt = log.sentAt?.toDate?.();
        return sentAt && sentAt >= todayStart;
      }).length;

      const emailsSentThisWeek = logs.filter((log) => {
        const sentAt = log.sentAt?.toDate?.();
        return sentAt && sentAt >= weekStart;
      }).length;

      const emailsSentThisMonth = logs.filter((log) => {
        const sentAt = log.sentAt?.toDate?.();
        return sentAt && sentAt >= monthStart;
      }).length;

      setStats({
        totalSubscribers,
        unsubscribedCount,
        jobAlertsEnabled,
        conferenceUpdatesEnabled,
        powwowUpdatesEnabled,
        shopUpdatesEnabled,
        weeklyDigestEnabled,
        emailsSentToday,
        emailsSentThisWeek,
        emailsSentThisMonth,
      });

      // Get recent email logs
      const recentLogsQuery = query(logsRef, orderBy("sentAt", "desc"), limit(20));
      const recentLogsSnap = await getDocs(recentLogsQuery);
      const recentLogsData = recentLogsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmailLog[];
      setRecentLogs(recentLogsData);
    } catch (error) {
      console.error("Error loading email stats:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns() {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/campaigns", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  }

  async function sendCampaign(testMode: boolean = false) {
    if (!user) return;
    if (!campaignSubject.trim() || !campaignContent.trim()) {
      setCampaignResult({ success: false, message: "Subject and content are required" });
      return;
    }
    if (testMode && !testEmail.trim()) {
      setCampaignResult({ success: false, message: "Test email address is required" });
      return;
    }

    setSendingCampaign(true);
    setCampaignResult(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          subject: campaignSubject,
          content: campaignContent,
          recipientFilter,
          testMode,
          testEmail: testMode ? testEmail : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCampaignResult({
          success: true,
          message: data.message || "Campaign sent successfully",
        });
        if (!testMode) {
          // Clear form and refresh data
          setCampaignSubject("");
          setCampaignContent("");
          setRecipientFilter("all");
          loadEmailStats();
          loadCampaigns();
        }
      } else {
        setCampaignResult({
          success: false,
          message: data.error || "Failed to send campaign",
        });
      }
    } catch (error) {
      setCampaignResult({
        success: false,
        message: "Error sending campaign",
      });
    } finally {
      setSendingCampaign(false);
    }
  }

  async function triggerCampaign(campaignType: string) {
    setTriggeringCampaign(campaignType);
    setTriggerResult(null);

    try {
      // Get user's auth token
      if (!user) {
        setTriggerResult({
          type: campaignType,
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      const idToken = await user.getIdToken();

      const response = await fetch("/api/admin/trigger-email-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ campaignType }),
      });

      const data = await response.json();

      if (response.ok) {
        setTriggerResult({
          type: campaignType,
          success: true,
          message: data.message || `${campaignType} campaign triggered successfully`,
        });
        // Reload stats after triggering
        setTimeout(() => loadEmailStats(), 2000);
      } else {
        setTriggerResult({
          type: campaignType,
          success: false,
          message: data.error || `Failed to trigger ${campaignType} campaign`,
        });
      }
    } catch (error) {
      setTriggerResult({
        type: campaignType,
        success: false,
        message: `Error triggering ${campaignType} campaign`,
      });
    } finally {
      setTriggeringCampaign(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading email dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]">
          ← Admin Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Email Campaigns</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Manage email notifications and view campaign statistics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--card-border)] pb-px">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "dashboard"
              ? "bg-surface text-[#14B8A6] border-b-2 border-[#14B8A6]"
              : "text-[var(--text-muted)] hover:text-foreground"
          }`}
        >
          <ChartBarIcon className="inline-block w-4 h-4 mr-2" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("compose")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "compose"
              ? "bg-surface text-[#14B8A6] border-b-2 border-[#14B8A6]"
              : "text-[var(--text-muted)] hover:text-foreground"
          }`}
        >
          <PencilSquareIcon className="inline-block w-4 h-4 mr-2" />
          Compose Campaign
        </button>
      </div>

      {/* Compose Campaign Tab */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">New Email Campaign</h2>

            {campaignResult && (
              <div
                className={`mb-4 rounded-lg p-4 ${
                  campaignResult.success
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {campaignResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-400" />
                  )}
                  <span className={campaignResult.success ? "text-green-400" : "text-red-400"}>
                    {campaignResult.message}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-4 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
                />
              </div>

              {/* Recipient Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Recipients
                </label>
                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value as RecipientFilter)}
                  className="w-full px-4 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground focus:outline-none focus:border-[#14B8A6]"
                >
                  <option value="all">All Subscribers</option>
                  <option value="job_seekers">Job Seekers (Job Alerts Enabled)</option>
                  <option value="employers">Approved Employers</option>
                  <option value="digest_subscribers">Weekly Digest Subscribers</option>
                </select>
                <p className="mt-1 text-xs text-foreground0">
                  {recipientFilter === "all" && stats && `${stats.totalSubscribers - stats.unsubscribedCount} recipients`}
                  {recipientFilter === "job_seekers" && stats && `${stats.jobAlertsEnabled} recipients`}
                  {recipientFilter === "employers" && "All approved employer accounts"}
                  {recipientFilter === "digest_subscribers" && stats && `${stats.weeklyDigestEnabled} recipients`}
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email Content
                  <span className="ml-2 text-xs text-foreground0">(Markdown supported: # heading, ## subheading, - bullet)</span>
                </label>
                <textarea
                  value={campaignContent}
                  onChange={(e) => setCampaignContent(e.target.value)}
                  placeholder="Enter your email content here..."
                  rows={10}
                  className="w-full px-4 py-3 bg-surface border border-[var(--card-border)] rounded-lg text-foreground placeholder-slate-500 focus:outline-none focus:border-[#14B8A6] font-mono text-sm"
                />
              </div>

              {/* Preview Toggle */}
              {campaignContent && (
                <div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-sm text-[#14B8A6] hover:text-[#0D9488]"
                  >
                    <EyeIcon className="w-4 h-4" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </button>

                  {showPreview && (
                    <div className="mt-4 p-4 bg-surface rounded-lg border border-[var(--card-border)]">
                      <p className="text-xs text-foreground0 mb-2">Preview:</p>
                      <div className="prose prose-invert prose-sm max-w-none">
                        {campaignContent.split("\n\n").map((paragraph, i) => {
                          if (paragraph.startsWith("# ")) {
                            return <h1 key={i} className="text-xl font-bold text-foreground mt-4 mb-2">{paragraph.slice(2)}</h1>;
                          }
                          if (paragraph.startsWith("## ")) {
                            return <h2 key={i} className="text-lg font-semibold text-foreground mt-3 mb-2">{paragraph.slice(3)}</h2>;
                          }
                          if (paragraph.startsWith("- ")) {
                            return (
                              <ul key={i} className="list-disc list-inside text-[var(--text-secondary)] my-2">
                                {paragraph.split("\n").map((line, j) => (
                                  <li key={j}>{line.slice(2)}</li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={i} className="text-[var(--text-secondary)] my-2">{paragraph}</p>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Test Email */}
              <div className="pt-4 border-t border-[var(--card-border)]">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Send Test Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="flex-1 px-4 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
                  />
                  <button
                    onClick={() => sendCampaign(true)}
                    disabled={sendingCampaign || !campaignSubject || !campaignContent || !testEmail}
                    className="px-4 py-2 bg-slate-700 text-foreground rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingCampaign ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                    ) : (
                      <EnvelopeIcon className="h-4 w-4" />
                    )}
                    Send Test
                  </button>
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to send this campaign to all ${recipientFilter.replace(/_/g, " ")}? This action cannot be undone.`)) {
                      sendCampaign(false);
                    }
                  }}
                  disabled={sendingCampaign || !campaignSubject || !campaignContent}
                  className="px-6 py-3 bg-accent text-slate-900 font-semibold rounded-lg hover:bg-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingCampaign ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-white" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                  Send Campaign
                </button>
              </div>
            </div>
          </div>

          {/* Campaign History */}
          {campaigns.length > 0 && (
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Campaign History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Subject</th>
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Recipients</th>
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Sent</th>
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Failed</th>
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Status</th>
                      <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--card-border)]">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">{campaign.subject}</td>
                        <td className="py-3 text-sm text-[var(--text-secondary)] capitalize">{campaign.recipientFilter.replace(/_/g, " ")}</td>
                        <td className="py-3 text-sm text-green-400">{campaign.sentCount}</td>
                        <td className="py-3 text-sm text-red-400">{campaign.failedCount}</td>
                        <td className="py-3">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="py-3 text-sm text-[var(--text-muted)]">
                          {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Subscribers"
            value={stats.totalSubscribers}
            subtitle={`${stats.unsubscribedCount} unsubscribed`}
            icon={UserGroupIcon}
            color="blue"
          />
          <StatCard
            label="Emails Today"
            value={stats.emailsSentToday}
            subtitle={`${stats.emailsSentThisWeek} this week`}
            icon={EnvelopeIcon}
            color="green"
          />
          <StatCard
            label="Emails This Month"
            value={stats.emailsSentThisMonth}
            icon={ChartBarIcon}
            color="purple"
          />
          <StatCard
            label="Weekly Digest"
            value={stats.weeklyDigestEnabled}
            subtitle="subscribers"
            icon={ClockIcon}
            color="orange"
          />
        </div>
      )}

      {/* Subscription Breakdown */}
      {stats && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Subscription Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SubscriptionStat label="Job Alerts" count={stats.jobAlertsEnabled} total={stats.totalSubscribers} />
            <SubscriptionStat
              label="Conference Updates"
              count={stats.conferenceUpdatesEnabled}
              total={stats.totalSubscribers}
            />
            <SubscriptionStat label="Pow Wow Updates" count={stats.powwowUpdatesEnabled} total={stats.totalSubscribers} />
            <SubscriptionStat label="Shop Updates" count={stats.shopUpdatesEnabled} total={stats.totalSubscribers} />
            <SubscriptionStat label="Weekly Digest" count={stats.weeklyDigestEnabled} total={stats.totalSubscribers} />
          </div>
        </div>
      )}

      {/* Manual Campaign Triggers */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Manual Campaign Triggers</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Manually trigger email campaigns. Use with caution - emails will be sent to all eligible subscribers.
        </p>

        {triggerResult && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              triggerResult.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {triggerResult.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-400" />
              )}
              <span className={triggerResult.success ? "text-green-400" : "text-red-400"}>{triggerResult.message}</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CampaignButton
            label="Conference Alerts"
            description="New conferences this week"
            onClick={() => triggerCampaign("conference-alerts")}
            loading={triggeringCampaign === "conference-alerts"}
          />
          <CampaignButton
            label="Pow Wow Alerts"
            description="New pow wows & events"
            onClick={() => triggerCampaign("powwow-alerts")}
            loading={triggeringCampaign === "powwow-alerts"}
          />
          <CampaignButton
            label="Vendor Alerts"
            description="New Shop Indigenous businesses"
            onClick={() => triggerCampaign("vendor-alerts")}
            loading={triggeringCampaign === "vendor-alerts"}
          />
          <CampaignButton
            label="Weekly Digest"
            description="Combined weekly summary"
            onClick={() => triggerCampaign("weekly-digest")}
            loading={triggeringCampaign === "weekly-digest"}
          />
        </div>
      </div>

      {/* Recent Email Logs */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Email Activity</h2>
        {recentLogs.length === 0 ? (
          <p className="text-[var(--text-muted)]">No email logs found. Logs will appear here after emails are sent.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Recipient</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Campaign</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Subject</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Status</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--text-muted)]">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 text-sm text-[var(--text-secondary)]">{log.userEmail || "Unknown"}</td>
                    <td className="py-3 text-sm text-[var(--text-secondary)] capitalize">{log.campaignType?.replace(/-/g, " ") || "N/A"}</td>
                    <td className="py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">{log.subject || "N/A"}</td>
                    <td className="py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3 text-sm text-[var(--text-muted)]">
                      {log.sentAt?.toDate?.()?.toLocaleString() || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ label, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  const iconColors = {
    blue: "text-blue-400",
    green: "text-green-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
  };

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${iconColors[color]}`} />
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
          <p className={`text-3xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-foreground0">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface SubscriptionStatProps {
  label: string;
  count: number;
  total: number;
}

function SubscriptionStat({ label, count, total }: SubscriptionStatProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="text-center p-4 rounded-lg bg-surface">
      <p className="text-2xl font-bold text-foreground">{count}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-foreground0 mt-1">{percentage}% of subscribers</p>
    </div>
  );
}

interface CampaignButtonProps {
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
}

function CampaignButton({ label, description, onClick, loading }: CampaignButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center justify-center p-6 rounded-xl border border-[var(--card-border)] bg-surface hover:bg-surface hover:border-[#14B8A6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-[#14B8A6]" />
      ) : (
        <PlayIcon className="h-8 w-8 text-[#14B8A6]" />
      )}
      <p className="mt-2 font-semibold text-foreground">{label}</p>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    sent: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    bounced: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        styles[status as keyof typeof styles] || styles.sent
      }`}
    >
      {status}
    </span>
  );
}
