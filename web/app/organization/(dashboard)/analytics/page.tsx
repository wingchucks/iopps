"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobPosting, JobApplication } from "@/lib/types";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface EmployerAnalytics {
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  totalApplications: number;
  applicationsLast30Days: number;
  applicationsByStatus: { status: string; count: number }[];
  avgApplicationsPerJob: number;
  topPerformingJobs: { jobId: string; title: string; applications: number }[];
  jobsByMonth: { month: string; count: number }[];
  applicationsByMonth: { month: string; count: number }[];
  platformAvgApplicationsPerJob: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<EmployerAnalytics | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAnalytics();
  }, [user]);

  async function loadAnalytics() {
    if (!user) return;

    try {
      setLoading(true);

      // Get employer's jobs
      const jobsRef = collection(db!, "jobs");
      const jobsQuery = query(
        jobsRef,
        where("employerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const jobsSnap = await getDocs(jobsQuery);
      const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobPosting[];

      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.active === true).length;
      const inactiveJobs = jobs.filter(j => j.active === false).length;

      // Get employer's applications
      const applicationsRef = collection(db!, "applications");
      const applicationsQuery = query(
        applicationsRef,
        where("employerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const applicationsSnap = await getDocs(applicationsQuery);
      const applications = applicationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as JobApplication[];

      const totalApplications = applications.length;

      // Applications in last 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const applicationsLast30Days = applications.filter(app => {
        if (!app.createdAt) return false;
        const createdDate = new Date(app.createdAt.seconds * 1000);
        return createdDate.getTime() >= thirtyDaysAgo;
      }).length;

      // Applications by status
      const statusCounts = new Map<string, number>();
      applications.forEach(app => {
        const status = app.status || "submitted";
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      const applicationsByStatus = Array.from(statusCounts.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Average applications per job
      const avgApplicationsPerJob = totalJobs > 0
        ? Math.round((totalApplications / totalJobs) * 10) / 10
        : 0;

      // Top performing jobs
      const jobApplicationCounts = new Map<string, { title: string; count: number }>();
      jobs.forEach(job => {
        jobApplicationCounts.set(job.id, { title: job.title, count: 0 });
      });

      applications.forEach(app => {
        const jobData = jobApplicationCounts.get(app.jobId);
        if (jobData) {
          jobData.count++;
        }
      });

      const topPerformingJobs = Array.from(jobApplicationCounts.entries())
        .map(([jobId, data]) => ({ jobId, title: data.title, applications: data.count }))
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5);

      // Jobs posted by month
      const jobsByMonth = aggregateByMonth(jobs, "createdAt");

      // Applications by month
      const applicationsByMonth = aggregateByMonth(applications, "createdAt");

      const platformAvgApplicationsPerJob = avgApplicationsPerJob;

      setAnalytics({
        totalJobs,
        activeJobs,
        inactiveJobs,
        totalApplications,
        applicationsLast30Days,
        applicationsByStatus,
        avgApplicationsPerJob,
        topPerformingJobs,
        jobsByMonth,
        applicationsByMonth,
        platformAvgApplicationsPerJob,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function aggregateByMonth(items: any[], dateField: string) {
    const monthCounts = new Map<string, number>();

    items.forEach(item => {
      const date = item[dateField];
      if (!date) return;

      let dateObj: Date;
      if (date.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === "string") {
        dateObj = new Date(date);
      } else {
        return;
      }

      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });

    return Array.from(monthCounts.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }

  async function exportToCSV() {
    if (!analytics) return;

    const csvData = `Employer Analytics Report
Generated: ${new Date().toLocaleString()}

=== JOB METRICS ===
Total Jobs Posted,${analytics.totalJobs}
Active Jobs,${analytics.activeJobs}
Inactive Jobs,${analytics.inactiveJobs}

=== APPLICATION METRICS ===
Total Applications,${analytics.totalApplications}
Applications (Last 30 Days),${analytics.applicationsLast30Days}
Average Applications per Job,${analytics.avgApplicationsPerJob}

=== TOP PERFORMING JOBS ===
${analytics.topPerformingJobs.map(j => `${j.title},${j.applications} applications`).join("\n")}

=== APPLICATION STATUS BREAKDOWN ===
${analytics.applicationsByStatus.map(s => `${s.status},${s.count}`).join("\n")}
`;

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employer-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <p className="text-red-400">Failed to load analytics data.</p>
      </div>
    );
  }

  const performanceVsPlatform = analytics.avgApplicationsPerJob - analytics.platformAvgApplicationsPerJob;
  const performancePercentage = analytics.platformAvgApplicationsPerJob > 0
    ? Math.round((performanceVsPlatform / analytics.platformAvgApplicationsPerJob) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Track your job performance and recruitment metrics
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Jobs"
          value={analytics.totalJobs}
          subtitle={`${analytics.activeJobs} active, ${analytics.inactiveJobs} inactive`}
          color="blue"
        />
        <MetricCard
          label="Total Applications"
          value={analytics.totalApplications}
          subtitle={`${analytics.applicationsLast30Days} in last 30 days`}
          color="purple"
        />
        <MetricCard
          label="Avg per Job"
          value={analytics.avgApplicationsPerJob}
          subtitle="applications per posting"
          color="amber"
        />
        <MetricCard
          label="vs Platform"
          value={performancePercentage >= 0 ? `+${performancePercentage}%` : `${performancePercentage}%`}
          subtitle={performancePercentage >= 0 ? "above average" : "below average"}
          color={performancePercentage >= 0 ? "green" : "red"}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Posting Trends */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Jobs Posted (Last 6 Months)</h2>
          {analytics.jobsByMonth.length > 0 ? (
            <div className="space-y-3">
              {analytics.jobsByMonth.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-[var(--text-muted)]">{month.month}</div>
                  <div className="flex-1">
                    <div className="h-6 rounded-lg bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                        style={{
                          width: `${Math.min((month.count / Math.max(...analytics.jobsByMonth.map(m => m.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-8 text-right text-sm font-semibold text-foreground">
                    {month.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8">No jobs posted yet</p>
          )}
        </div>

        {/* Application Trends */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Applications (Last 6 Months)</h2>
          {analytics.applicationsByMonth.length > 0 ? (
            <div className="space-y-3">
              {analytics.applicationsByMonth.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-[var(--text-muted)]">{month.month}</div>
                  <div className="flex-1">
                    <div className="h-6 rounded-lg bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                        style={{
                          width: `${Math.min((month.count / Math.max(...analytics.applicationsByMonth.map(m => m.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-8 text-right text-sm font-semibold text-foreground">
                    {month.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8">No applications received yet</p>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Jobs */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top Performing Jobs</h2>
          {analytics.topPerformingJobs.filter(j => j.applications > 0).length > 0 ? (
            <div className="space-y-4">
              {analytics.topPerformingJobs.filter(j => j.applications > 0).map((job, index) => (
                <div key={job.jobId} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-slate-950">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/careers/${job.jobId}`}
                      className="text-sm font-medium text-foreground hover:text-accent truncate block"
                    >
                      {job.title}
                    </Link>
                    <div className="text-xs text-foreground0">
                      {job.applications} application{job.applications !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8">No applications received yet</p>
          )}
        </div>

        {/* Application Status Breakdown */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Applications by Status</h2>
          {analytics.applicationsByStatus.length > 0 ? (
            <div className="space-y-4">
              {analytics.applicationsByStatus.map((item) => {
                const colors: Record<string, string> = {
                  submitted: "from-blue-500 to-blue-600",
                  reviewed: "from-purple-500 to-purple-600",
                  shortlisted: "from-yellow-500 to-yellow-600",
                  hired: "from-green-500 to-green-600",
                  rejected: "from-red-500 to-red-600",
                  withdrawn: "from-slate-500 to-slate-600",
                };
                const color = colors[item.status] || "from-slate-500 to-slate-600";

                return (
                  <div key={item.status}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--text-secondary)] capitalize">{item.status}</span>
                      <span className="font-semibold text-foreground">
                        {item.count} ({Math.round((item.count / analytics.totalApplications) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color}`}
                        style={{
                          width: `${(item.count / analytics.totalApplications) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8">No applications received yet</p>
          )}
        </div>
      </div>

      {/* Empty State CTA */}
      {analytics.totalJobs === 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[var(--text-secondary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-secondary)]">
            No analytics data yet
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Post your first job to start tracking performance and applications.
          </p>
          <Link
            href="/organization/jobs/new"
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent/90"
          >
            Post a Job
          </Link>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  color: "blue" | "purple" | "amber" | "green" | "red";
}

function MetricCard({ label, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-5`}>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-foreground0">{subtitle}</p>}
    </div>
  );
}
