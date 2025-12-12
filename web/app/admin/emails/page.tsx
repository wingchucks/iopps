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

export default function AdminEmailsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<EmailLog[]>([]);
  const [triggeringCampaign, setTriggeringCampaign] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

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

  async function triggerCampaign(campaignType: string) {
    setTriggeringCampaign(campaignType);
    setTriggerResult(null);

    try {
      const response = await fetch(`/api/emails/send-${campaignType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
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
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading email dashboard...</p>
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
        <Link href="/admin" className="text-sm text-slate-400 hover:text-[#14B8A6]">
          ← Admin Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Email Campaigns</h1>
        <p className="mt-1 text-sm text-slate-400">Manage email notifications and view campaign statistics</p>
      </div>

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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4">Subscription Breakdown</h2>
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-slate-50 mb-2">Manual Campaign Triggers</h2>
        <p className="text-sm text-slate-400 mb-4">
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-slate-50 mb-4">Recent Email Activity</h2>
        {recentLogs.length === 0 ? (
          <p className="text-slate-400">No email logs found. Logs will appear here after emails are sent.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="pb-3 text-left text-sm font-medium text-slate-400">Recipient</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-400">Campaign</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-400">Subject</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-400">Status</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-400">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 text-sm text-slate-300">{log.userEmail || "Unknown"}</td>
                    <td className="py-3 text-sm text-slate-300 capitalize">{log.campaignType?.replace(/-/g, " ") || "N/A"}</td>
                    <td className="py-3 text-sm text-slate-300 max-w-xs truncate">{log.subject || "N/A"}</td>
                    <td className="py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3 text-sm text-slate-400">
                      {log.sentAt?.toDate?.()?.toLocaleString() || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${iconColors[color]}`} />
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className={`text-3xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
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
    <div className="text-center p-4 rounded-lg bg-slate-800/50">
      <p className="text-2xl font-bold text-slate-50">{count}</p>
      <p className="text-sm text-slate-400">{label}</p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">{percentage}% of subscribers</p>
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
      className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-[#14B8A6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-[#14B8A6]" />
      ) : (
        <PlayIcon className="h-8 w-8 text-[#14B8A6]" />
      )}
      <p className="mt-2 font-semibold text-slate-200">{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
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
