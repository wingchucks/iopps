"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import type { JobPosting, JobApplication, ApplicationStatus } from "@/lib/types";

interface EmployerAnalytics {
  // Job metrics
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;

  // Application metrics
  totalApplications: number;
  applicationsLast30Days: number;
  applicationsByStatus: { status: string; count: number }[];
  avgApplicationsPerJob: number;

  // Performance metrics
  topPerformingJobs: { jobId: string; title: string; applications: number }[];
  jobsByMonth: { month: string; count: number }[];
  applicationsByMonth: { month: string; count: number }[];

  // Comparison to platform
  platformAvgApplicationsPerJob: number;
}

export default function EmployerAnalyticsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<EmployerAnalytics | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || role !== "employer") {
      router.push("/");
      return;
    }

    loadAnalytics();
  }, [user, role, authLoading, router]);

  async function loadAnalytics() {
    if (!user) return;

    try {
      setLoading(true);

      // Get employer's jobs
      const jobsRef = collection(db, "jobs");
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
      const applicationsRef = collection(db, "applications");
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

      // Get platform average (simplified - just use all jobs for comparison)
      const allJobsRef = collection(db, "jobs");
      const allJobsSnap = await getDocs(allJobsRef);
      const allApplicationsRef = collection(db, "applications");
      const allApplicationsSnap = await getDocs(allApplicationsRef);
      const platformAvgApplicationsPerJob = allJobsSnap.size > 0
        ? Math.round((allApplicationsSnap.size / allJobsSnap.size) * 10) / 10
        : 0;

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
      .slice(-6); // Last 6 months
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

=== PERFORMANCE COMPARISON ===
Your Avg Applications per Job,${analytics.avgApplicationsPerJob}
Platform Avg Applications per Job,${analytics.platformAvgApplicationsPerJob}
Performance vs Platform,${analytics.avgApplicationsPerJob > analytics.platformAvgApplicationsPerJob ? "Above Average" : analytics.avgApplicationsPerJob < analytics.platformAvgApplicationsPerJob ? "Below Average" : "Average"}

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return null;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-red-400">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  const performanceVsPlatform = analytics.avgApplicationsPerJob - analytics.platformAvgApplicationsPerJob;
  const performancePercentage = analytics.platformAvgApplicationsPerJob > 0
    ? Math.round((performanceVsPlatform / analytics.platformAvgApplicationsPerJob) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/employer"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Employer Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Your Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Track your job performance and recruitment metrics
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Key Metrics Overview */}
        <div>
          <h2 className="text-xl font-semibold text-slate-50 mb-4">Overview</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              color="orange"
            />
            <MetricCard
              label="vs Platform"
              value={performancePercentage >= 0 ? `+${performancePercentage}%` : `${performancePercentage}%`}
              subtitle={performancePercentage >= 0 ? "above average" : "below average"}
              color={performancePercentage >= 0 ? "green" : "red"}
            />
          </div>
        </div>

        {/* Performance Comparison */}
        <div>
          <h2 className="text-xl font-semibold text-slate-50 mb-4">Performance Comparison</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400 mb-2">Your Average</p>
                <p className="text-3xl font-bold text-[#14B8A6]">{analytics.avgApplicationsPerJob}</p>
                <p className="text-xs text-slate-500 mt-1">applications per job</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Platform Average</p>
                <p className="text-3xl font-bold text-slate-300">{analytics.platformAvgApplicationsPerJob}</p>
                <p className="text-xs text-slate-500 mt-1">across all employers</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Your Performance</span>
                <span className={`font-semibold ${performancePercentage >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {performancePercentage >= 0 ? `${performancePercentage}% above average` : `${Math.abs(performancePercentage)}% below average`}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${performancePercentage >= 0 ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-red-500 to-red-600"}`}
                  style={{
                    width: `${Math.min(Math.abs(performancePercentage) * 2, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Job Posting Trends */}
          <div>
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Jobs Posted (Last 6 Months)</h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              {analytics.jobsByMonth.length > 0 ? (
                <div className="space-y-3">
                  {analytics.jobsByMonth.map((month) => (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-400">{month.month}</div>
                      <div className="flex-1">
                        <div className="h-8 rounded-lg bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                            style={{
                              width: `${Math.min((month.count / Math.max(...analytics.jobsByMonth.map(m => m.count))) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-semibold text-slate-200">
                        {month.count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No jobs posted yet</p>
              )}
            </div>
          </div>

          {/* Application Trends */}
          <div>
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Applications Received (Last 6 Months)</h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              {analytics.applicationsByMonth.length > 0 ? (
                <div className="space-y-3">
                  {analytics.applicationsByMonth.map((month) => (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-400">{month.month}</div>
                      <div className="flex-1">
                        <div className="h-8 rounded-lg bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                            style={{
                              width: `${Math.min((month.count / Math.max(...analytics.applicationsByMonth.map(m => m.count))) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-semibold text-slate-200">
                        {month.count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No applications received yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top Performing Jobs */}
          <div>
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Top Performing Jobs</h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              {analytics.topPerformingJobs.filter(j => j.applications > 0).length > 0 ? (
                <div className="space-y-4">
                  {analytics.topPerformingJobs.filter(j => j.applications > 0).map((job, index) => (
                    <div key={job.jobId} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14B8A6] text-sm font-bold text-slate-900">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/jobs/${job.jobId}`}
                          className="text-sm font-medium text-slate-200 hover:text-[#14B8A6]"
                        >
                          {job.title}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {job.applications} application{job.applications !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No applications received yet</p>
              )}
            </div>
          </div>

          {/* Application Status Breakdown */}
          <div>
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Applications by Status</h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
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
                          <span className="text-slate-300 capitalize">{item.status}</span>
                          <span className="font-semibold text-slate-200">
                            {item.count} ({Math.round((item.count / analytics.totalApplications) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
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
                <p className="text-center text-slate-400 py-8">No applications received yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        {analytics.totalJobs === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-600"
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
            <h3 className="mt-4 text-lg font-semibold text-slate-300">
              No analytics data yet
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Post your first job to start tracking performance and applications.
            </p>
            <Link
              href="/employer/jobs/new"
              className="mt-6 inline-block rounded-md bg-[#14B8A6] px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
            >
              Post a Job
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  color: "blue" | "purple" | "orange" | "green" | "red";
}

function MetricCard({ label, value, subtitle, color }: MetricCardProps) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className={`mt-2 text-4xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
