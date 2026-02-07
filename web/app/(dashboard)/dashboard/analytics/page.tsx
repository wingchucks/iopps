"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getJobStats,
  getUserStats,
  getApplicationStats,
  getTopEmployers,
  getJobsByCategory,
  getTimeSeriesData,
  getRecentActivity,
  type JobStats,
  type UserStats,
  type ApplicationStats,
  type TopEmployer,
  type JobsByCategory,
  type TimeSeriesDataPoint,
  type RecentActivity,
  type DateRange,
} from "@/lib/analytics";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import {
  LineChart,
  PieChart,
  type ChartDataPoint,
} from "@/components/analytics/SimpleChart";
import {
  BriefcaseIcon,
  UsersIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  // Analytics data
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [applicationStats, setApplicationStats] =
    useState<ApplicationStats | null>(null);
  const [topEmployers, setTopEmployers] = useState<TopEmployer[]>([]);
  const [jobsByCategory, setJobsByCategory] = useState<JobsByCategory[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>(
    []
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Auth check
  useEffect(() => {
    if (authLoading) return;

    if (!user || !role) {
      router.push("/login");
      return;
    }

    const isAuthorized = role === "admin" || role === "moderator";
    if (!isAuthorized) {
      router.push("/");
      return;
    }
  }, [user, role, authLoading, router]);

  // Load analytics data
  useEffect(() => {
    if (!user || !role || role !== "admin" && role !== "moderator") return;
    loadAnalytics();
  }, [user, role, dateRange]);

  async function loadAnalytics() {
    try {
      setLoading(true);

      const [jobs, users, applications, employers, categories, timeSeries, activity] =
        await Promise.all([
          getJobStats(dateRange),
          getUserStats(dateRange),
          getApplicationStats(dateRange),
          getTopEmployers(10),
          getJobsByCategory(),
          getTimeSeriesData("applications", dateRange),
          getRecentActivity(10),
        ]);

      setJobStats(jobs);
      setUserStats(users);
      setApplicationStats(applications);
      setTopEmployers(employers);
      setJobsByCategory(categories);
      setTimeSeriesData(timeSeries);
      setRecentActivity(activity);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-[#0F172A]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-[var(--text-muted)] transition hover:text-[#14B8A6]"
              >
                ← Back to Admin
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Platform metrics and insights
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-foreground0" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="rounded-lg border border-[var(--card-border)] bg-[#0F172A] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[#14B8A6] focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Summary Cards */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Overview
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsCard
                title="Total Jobs"
                value={jobStats?.total || 0}
                subtitle={`${jobStats?.active || 0} active`}
                icon={<BriefcaseIcon className="h-5 w-5" />}
                colorScheme="teal"
                loading={loading}
              />
              <AnalyticsCard
                title="Total Users"
                value={userStats?.total || 0}
                subtitle={`${userStats?.newThisWeek || 0} new this week`}
                icon={<UsersIcon className="h-5 w-5" />}
                colorScheme="blue"
                loading={loading}
              />
              <AnalyticsCard
                title="Applications"
                value={applicationStats?.total || 0}
                subtitle={`${applicationStats?.thisWeek || 0} this week`}
                icon={<DocumentTextIcon className="h-5 w-5" />}
                colorScheme="purple"
                loading={loading}
              />
              <AnalyticsCard
                title="Employers"
                value={userStats?.employers || 0}
                subtitle="Active employers"
                icon={<BuildingOfficeIcon className="h-5 w-5" />}
                colorScheme="orange"
                loading={loading}
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Jobs by Category Chart */}
            <div className="rounded-2xl border border-[var(--card-border)]/80 bg-[#0F172A] p-6 shadow-lg shadow-black/30">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Jobs by Category
              </h3>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--card-border)] border-t-[#14B8A6]"></div>
                </div>
              ) : (
                <PieChart
                  data={jobsByCategory.slice(0, 6).map((cat) => ({
                    label: cat.category,
                    value: cat.count,
                  }))}
                  size={280}
                  donut={true}
                  donutThickness={50}
                  showLegend={true}
                />
              )}
            </div>

            {/* Applications Over Time */}
            <div className="rounded-2xl border border-[var(--card-border)]/80 bg-[#0F172A] p-6 shadow-lg shadow-black/30">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Applications Over Time
              </h3>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--card-border)] border-t-[#14B8A6]"></div>
                </div>
              ) : (
                <LineChart
                  data={timeSeriesData}
                  height={280}
                  showGrid={true}
                  showPoints={true}
                />
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Top Employers Table */}
            <div className="rounded-2xl border border-[var(--card-border)]/80 bg-[#0F172A] p-6 shadow-lg shadow-black/30">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Top Employers
              </h3>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-surface"
                    />
                  ))}
                </div>
              ) : topEmployers.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground0">
                  No employer data available
                </p>
              ) : (
                <div className="space-y-3">
                  {topEmployers.map((employer, index) => (
                    <div
                      key={employer.id}
                      className="group flex items-center gap-4 rounded-lg border border-[var(--card-border)]/50 bg-slate-900/30 p-4 transition hover:border-[#14B8A6]/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-sm font-bold text-slate-900 shadow-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {employer.name}
                        </h4>
                        <p className="text-xs text-foreground0">
                          {employer.jobCount} jobs • {employer.applicationCount}{" "}
                          applications
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#14B8A6]">
                          {employer.activeJobs}
                        </p>
                        <p className="text-xs text-foreground0">active</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-2xl border border-[var(--card-border)]/80 bg-[#0F172A] p-6 shadow-lg shadow-black/30">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Recent Activity
              </h3>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-surface"
                    />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground0">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const activityIcons = {
                      job_posted: BriefcaseIcon,
                      application: DocumentTextIcon,
                      employer_approved: BuildingOfficeIcon,
                      user_registered: UsersIcon,
                    };

                    const Icon = activityIcons[activity.type];

                    const timeAgo = activity.timestamp
                      ? getTimeAgo(activity.timestamp.seconds * 1000)
                      : "Unknown";

                    return (
                      <div
                        key={activity.id}
                        className="group flex gap-4 rounded-lg border border-[var(--card-border)]/50 bg-slate-900/30 p-4 transition hover:border-[#14B8A6]/50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">
                          <Icon className="h-5 w-5 text-[#14B8A6]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-foreground">
                            {activity.title}
                          </h4>
                          <p className="mt-0.5 text-xs text-foreground0">
                            {activity.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
                            <ClockIcon className="h-3 w-3" />
                            <span>{timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Application Status Breakdown */}
          <div className="rounded-2xl border border-[var(--card-border)]/80 bg-[#0F172A] p-6 shadow-lg shadow-black/30">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Application Status Breakdown
            </h3>
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-surface"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Submitted",
                    value: applicationStats?.submitted || 0,
                    color: "blue",
                  },
                  {
                    label: "Reviewed",
                    value: applicationStats?.reviewed || 0,
                    color: "purple",
                  },
                  {
                    label: "Shortlisted",
                    value: applicationStats?.shortlisted || 0,
                    color: "orange",
                  },
                  {
                    label: "Hired",
                    value: applicationStats?.hired || 0,
                    color: "green",
                  },
                  {
                    label: "Rejected",
                    value: applicationStats?.rejected || 0,
                    color: "red",
                  },
                  {
                    label: "Withdrawn",
                    value: applicationStats?.withdrawn || 0,
                    color: "slate",
                  },
                ].map((status) => {
                  const total = applicationStats?.total || 1;
                  const percentage = ((status.value / total) * 100).toFixed(1);

                  return (
                    <div key={status.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                          {status.label}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {status.value} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full bg-${status.color}-500 transition-all duration-500`}
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              status.color === "slate"
                                ? "#64748b"
                                : undefined,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
