"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LineChart, BarChart, PieChart, type ChartDataPoint } from "@/components/analytics/SimpleChart";
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface AnalyticsData {
  totalApplications: number;
  newThisWeek: number;
  newThisMonth: number;
  statusCounts: Record<string, number>;
  timeline: { date: string; count: number }[];
  funnel: {
    submitted: number;
    reviewed: number;
    shortlisted: number;
    hired: number;
    rejected: number;
    withdrawn: number;
  };
  avgResponseTime: number | null;
  responseRate: number;
  hireRate: number;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "teal" | "blue" | "purple" | "orange" | "green";
}

function MetricCard({ label, value, subValue, icon, trend, trendValue, color = "teal" }: MetricCardProps) {
  const colorClasses = {
    teal: "from-teal-500/20 to-teal-500/5 border-accent/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
  };

  const iconColorClasses = {
    teal: "text-accent",
    blue: "text-blue-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    green: "text-green-400",
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-surface ${iconColorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-[var(--text-muted)]"
          }`}>
            {trend === "up" ? (
              <ArrowTrendingUpIcon className="w-3 h-3" />
            ) : trend === "down" ? (
              <ArrowTrendingDownIcon className="w-3 h-3" />
            ) : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        {subValue && <p className="text-xs text-foreground0 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

export default function ApplicationAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/organization/applications/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError("Unable to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-surface rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-surface rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently fail - don't block the dashboard
  }

  // Prepare chart data
  const timelineData: ChartDataPoint[] = data.timeline.slice(-14).map(item => ({
    label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: item.count,
  }));

  const statusData: ChartDataPoint[] = [
    { label: "Submitted", value: data.funnel.submitted, color: "#64748b" },
    { label: "Reviewed", value: data.funnel.reviewed, color: "#0EA5E9" },
    { label: "Shortlisted", value: data.funnel.shortlisted, color: "#8B5CF6" },
    { label: "Hired", value: data.funnel.hired, color: "#10B981" },
    { label: "Rejected", value: data.funnel.rejected, color: "#EF4444" },
  ].filter(item => item.value > 0);

  const funnelData: ChartDataPoint[] = [
    { label: "Submitted", value: data.funnel.submitted + data.funnel.reviewed + data.funnel.shortlisted + data.funnel.hired },
    { label: "Reviewed", value: data.funnel.reviewed + data.funnel.shortlisted + data.funnel.hired },
    { label: "Shortlisted", value: data.funnel.shortlisted + data.funnel.hired },
    { label: "Hired", value: data.funnel.hired },
  ];

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-surface overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-[var(--card-border)] cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <ChartBarIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Application Analytics</h2>
            <p className="text-xs text-foreground0">Track your recruitment performance</p>
          </div>
        </div>
        <button className="text-[var(--text-muted)] hover:text-foreground transition-colors">
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Applications"
              value={data.totalApplications}
              subValue={`${data.newThisWeek} this week`}
              icon={<UserGroupIcon className="w-5 h-5" />}
              color="teal"
            />
            <MetricCard
              label="Response Rate"
              value={`${data.responseRate}%`}
              subValue="Applications reviewed"
              icon={<CheckCircleIcon className="w-5 h-5" />}
              trend={data.responseRate >= 70 ? "up" : data.responseRate >= 40 ? "neutral" : "down"}
              trendValue={data.responseRate >= 70 ? "Good" : data.responseRate >= 40 ? "Fair" : "Low"}
              color="blue"
            />
            <MetricCard
              label="Avg Response Time"
              value={data.avgResponseTime ? `${data.avgResponseTime}h` : "—"}
              subValue="Time to first review"
              icon={<ClockIcon className="w-5 h-5" />}
              color="purple"
            />
            <MetricCard
              label="Hire Rate"
              value={`${data.hireRate}%`}
              subValue={`${data.funnel.hired} hired total`}
              icon={<CheckCircleIcon className="w-5 h-5" />}
              color="green"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timeline Chart */}
            <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/30 p-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Applications Over Time</h3>
              {timelineData.length > 0 && timelineData.some(d => d.value > 0) ? (
                <LineChart data={timelineData} height={200} showGrid showPoints />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-foreground0">
                  No application data yet
                </div>
              )}
            </div>

            {/* Status Distribution */}
            <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/30 p-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Status Distribution</h3>
              {statusData.length > 0 ? (
                <div className="flex justify-center">
                  <PieChart data={statusData} size={180} donut donutThickness={35} showLegend />
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-foreground0">
                  No application data yet
                </div>
              )}
            </div>
          </div>

          {/* Conversion Funnel */}
          {funnelData[0]?.value > 0 && (
            <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/30 p-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Recruitment Funnel</h3>
              <BarChart data={funnelData} horizontal />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
