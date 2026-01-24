"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getMemberEngagementStats,
  getMemberProfileViews,
  listMemberApplications,
} from "@/lib/firestore";
import type { MemberEngagementStats } from "@/lib/firestore";
import type { JobApplication } from "@/lib/types";
import {
  EyeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface ApplicationStats {
  total: number;
  byStatus: {
    submitted: number;
    reviewed: number;
    shortlisted: number;
    interview: number;
    hired: number;
    rejected: number;
  };
  responseRate: number;
  avgResponseDays: number;
}

interface ProfileViewData {
  date: string;
  count: number;
}

export default function AnalyticsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [engagementStats, setEngagementStats] = useState<MemberEngagementStats | null>(null);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);
  const [profileViewsData, setProfileViewsData] = useState<ProfileViewData[]>([]);
  const [recentViewers, setRecentViewers] = useState<{ name?: string; type: string; date: Date }[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);

        // Load data in parallel
        const [engagement, profileViews, applications] = await Promise.all([
          getMemberEngagementStats(user.uid),
          getMemberProfileViews(user.uid, 30),
          listMemberApplications(user.uid),
        ]);

        setEngagementStats(engagement);
        setProfileViewsData(profileViews.byDay);
        setRecentViewers(profileViews.recentViewers);

        // Calculate application stats
        const stats = calculateApplicationStats(applications);
        setApplicationStats(stats);
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  function calculateApplicationStats(applications: JobApplication[]): ApplicationStats {
    const byStatus = {
      submitted: 0,
      reviewed: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
    };

    let totalResponseDays = 0;
    let responsesReceived = 0;

    applications.forEach((app) => {
      const status = app.status || "submitted";
      if (status in byStatus) {
        byStatus[status as keyof typeof byStatus]++;
      } else {
        byStatus.submitted++;
      }

      // Calculate response time if we have both dates
      if (app.updatedAt && app.createdAt && status !== "submitted") {
        const created = app.createdAt.toDate ? app.createdAt.toDate() : new Date(app.createdAt as unknown as string);
        const updated = app.updatedAt.toDate ? app.updatedAt.toDate() : new Date(app.updatedAt as unknown as string);
        const daysDiff = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) {
          totalResponseDays += daysDiff;
          responsesReceived++;
        }
      }
    });

    const responded = byStatus.reviewed + byStatus.shortlisted + byStatus.interview + byStatus.hired + byStatus.rejected;
    const responseRate = applications.length > 0 ? Math.round((responded / applications.length) * 100) : 0;
    const avgResponseDays = responsesReceived > 0 ? Math.round(totalResponseDays / responsesReceived) : 0;

    return {
      total: applications.length,
      byStatus,
      responseRate,
      avgResponseDays,
    };
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-800 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />;
    if (trend === "down") return <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />;
    return null;
  };

  // Calculate max for chart scaling
  const maxViews = Math.max(...profileViewsData.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Your Analytics</h1>
        <p className="mt-1 text-slate-400">Track your profile performance and application progress</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={EyeIcon}
          label="Profile Views"
          value={engagementStats?.profileViews.total || 0}
          subValue={`${engagementStats?.profileViews.thisWeek || 0} this week`}
          trend={engagementStats?.profileViews.trend}
          color="blue"
        />
        <StatCard
          icon={BriefcaseIcon}
          label="Applications"
          value={applicationStats?.total || 0}
          subValue={`${applicationStats?.responseRate || 0}% response rate`}
          color="emerald"
        />
        <StatCard
          icon={UserGroupIcon}
          label="Connections"
          value={engagementStats?.connections.total || 0}
          subValue={`${engagementStats?.connections.thisMonth || 0} this month`}
          color="purple"
        />
        <StatCard
          icon={ChatBubbleLeftRightIcon}
          label="Conversations"
          value={engagementStats?.messages.conversations || 0}
          subValue={`${engagementStats?.messages.unread || 0} unread`}
          color="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Views Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Profile Views (Last 30 Days)</h3>
          {profileViewsData.length > 0 ? (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-32">
                {profileViewsData.slice(-14).map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500/60 rounded-t transition-all hover:bg-blue-500"
                      style={{ height: `${(day.count / maxViews) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                      title={`${day.date}: ${day.count} views`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{profileViewsData.slice(-14)[0]?.date.split("-").slice(1).join("/")}</span>
                <span>Today</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500">
              No profile views yet
            </div>
          )}
        </div>

        {/* Application Funnel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Application Funnel</h3>
          {applicationStats && applicationStats.total > 0 ? (
            <div className="space-y-3">
              <FunnelStep
                label="Applied"
                count={applicationStats.total}
                percentage={100}
                color="bg-slate-600"
              />
              <FunnelStep
                label="Reviewed"
                count={applicationStats.byStatus.reviewed + applicationStats.byStatus.shortlisted + applicationStats.byStatus.interview + applicationStats.byStatus.hired}
                percentage={Math.round(((applicationStats.byStatus.reviewed + applicationStats.byStatus.shortlisted + applicationStats.byStatus.interview + applicationStats.byStatus.hired) / applicationStats.total) * 100)}
                color="bg-blue-500"
              />
              <FunnelStep
                label="Shortlisted"
                count={applicationStats.byStatus.shortlisted + applicationStats.byStatus.interview + applicationStats.byStatus.hired}
                percentage={Math.round(((applicationStats.byStatus.shortlisted + applicationStats.byStatus.interview + applicationStats.byStatus.hired) / applicationStats.total) * 100)}
                color="bg-amber-500"
              />
              <FunnelStep
                label="Interview"
                count={applicationStats.byStatus.interview + applicationStats.byStatus.hired}
                percentage={Math.round(((applicationStats.byStatus.interview + applicationStats.byStatus.hired) / applicationStats.total) * 100)}
                color="bg-purple-500"
              />
              <FunnelStep
                label="Hired"
                count={applicationStats.byStatus.hired}
                percentage={Math.round((applicationStats.byStatus.hired / applicationStats.total) * 100)}
                color="bg-emerald-500"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500">
              Submit applications to see your funnel
            </div>
          )}
        </div>
      </div>

      {/* Recent Profile Viewers */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Profile Viewers</h3>
        {recentViewers.length > 0 ? (
          <div className="space-y-3">
            {recentViewers.slice(0, 5).map((viewer, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    {viewer.type === "employer" ? (
                      <BriefcaseIcon className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <UserGroupIcon className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">
                      {viewer.name || (viewer.type === "employer" ? "An employer" : "A community member")}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{viewer.type}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {formatTimeAgo(viewer.date)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <EyeIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No profile viewers yet</p>
            <p className="text-sm mt-1">Complete your profile to get noticed</p>
          </div>
        )}
      </div>

      {/* Performance Tips */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/20">
            <TrophyIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-300">Tips to Improve Your Visibility</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                Complete all sections of your profile for better match scores
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                Upload a professional resume to enable Quick Apply
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                Add your skills to appear in employer talent searches
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                Connect with others to expand your network
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subValue: string;
  trend?: "up" | "down" | "stable";
  color: "blue" | "emerald" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/20",
    emerald: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20",
    purple: "from-purple-500/20 to-pink-500/20 border-purple-500/20",
    amber: "from-amber-500/20 to-orange-500/20 border-amber-500/20",
  };

  const iconColors = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        {trend && (
          <span className="flex items-center gap-1">
            {trend === "up" && <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400" />}
            {trend === "down" && <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-100">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>
    </div>
  );
}

// Funnel Step Component
function FunnelStep({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Time ago formatter
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
