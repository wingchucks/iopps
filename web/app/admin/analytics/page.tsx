/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AnalyticsData {
  // User metrics
  totalUsers: number;
  communityMembers: number;
  employers: number;
  usersByMonth: { month: string; count: number }[];

  // Job metrics
  totalJobs: number;
  activeJobs: number;
  jobsByMonth: { month: string; count: number }[];
  jobsByEmploymentType: { type: string; count: number }[];
  jobsWithSalary: number;

  // Application metrics
  totalApplications: number;
  applicationsByStatus: { status: string; count: number }[];
  avgApplicationsPerJob: number;
  applicationRate: number;

  // Content metrics
  totalConferences: number;
  activeConferences: number;
  totalScholarships: number;
  activeScholarships: number;
  totalPowwows: number;
  activePowwows: number;
  totalVendors: number;
  activeVendors: number;
  featuredVendors: number;

  // Employer metrics
  topEmployers: { name: string; jobCount: number; applicationCount: number }[];

  // Geographic distribution
  topLocations: { location: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"30d" | "90d" | "all">("all");

  useEffect(() => {
    if (authLoading) return;

    if (!user || !role) {
      router.push("/");
      return;
    }

    // Check authorization with positive comparison for better type narrowing
    const isAuthorized = role === "admin" || role === "moderator";
    if (!isAuthorized) {
      router.push("/");
      return;
    }

    loadAnalytics();
  }, [user, role, authLoading, router]);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Get all users
      const usersRef = collection(db!, "users");
      const usersSnap = await getDocs(usersRef);
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const totalUsers = users.length;
      const communityMembers = users.filter(u => u.role === "community").length;
      const employers = users.filter(u => u.role === "employer").length;

      // User growth by month
      const usersByMonth = aggregateByMonth(users, "createdAt");

      // Get all jobs
      const jobsRef = collection(db!, "jobs");
      const jobsSnap = await getDocs(jobsRef);
      const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.active === true).length;
      const jobsWithSalary = jobs.filter(j => j.salaryRange).length;

      // Jobs by month
      const jobsByMonth = aggregateByMonth(jobs, "createdAt");

      // Jobs by employment type
      const employmentTypeCounts = new Map<string, number>();
      jobs.forEach(job => {
        const type = job.employmentType || "Unspecified";
        employmentTypeCounts.set(type, (employmentTypeCounts.get(type) || 0) + 1);
      });
      const jobsByEmploymentType = Array.from(employmentTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Get all applications
      const applicationsRef = collection(db!, "applications");
      const applicationsSnap = await getDocs(applicationsRef);
      const applications = applicationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const totalApplications = applications.length;

      // Applications by status
      const statusCounts = new Map<string, number>();
      applications.forEach(app => {
        const status = app.status || "unknown";
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      const applicationsByStatus = Array.from(statusCounts.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate avg applications per job
      const avgApplicationsPerJob = totalJobs > 0
        ? Math.round((totalApplications / totalJobs) * 10) / 10
        : 0;

      // Calculate application rate (applications per active job)
      const applicationRate = activeJobs > 0
        ? Math.round((totalApplications / activeJobs) * 10) / 10
        : 0;

      // Get conferences
      const conferencesRef = collection(db!, "conferences");
      const conferencesSnap = await getDocs(conferencesRef);
      const conferences = conferencesSnap.docs.map(doc => doc.data()) as any[];
      const totalConferences = conferences.length;
      const activeConferences = conferences.filter(c => c.active === true).length;

      // Get scholarships
      const scholarshipsRef = collection(db!, "scholarships");
      const scholarshipsSnap = await getDocs(scholarshipsRef);
      const scholarships = scholarshipsSnap.docs.map(doc => doc.data()) as any[];
      const totalScholarships = scholarships.length;
      const activeScholarships = scholarships.filter(s => s.active === true).length;

      // Get powwows
      const powwowsRef = collection(db!, "powwows");
      const powwowsSnap = await getDocs(powwowsRef);
      const powwows = powwowsSnap.docs.map(doc => doc.data()) as any[];
      const totalPowwows = powwows.length;
      const activePowwows = powwows.filter(p => p.active === true).length;

      // Get vendors
      const vendorsRef = collection(db!, "vendors");
      const vendorsSnap = await getDocs(vendorsRef);
      const vendors = vendorsSnap.docs.map(doc => doc.data()) as any[];
      const totalVendors = vendors.length;
      const activeVendors = vendors.filter(v => v.active === true).length;
      const featuredVendors = vendors.filter(v => v.featured === true).length;

      // Top employers by job count
      const employerJobCounts = new Map<string, { name: string; jobCount: number; applicationCount: number }>();

      jobs.forEach(job => {
        const employerId = job.employerId;
        const employerName = job.employerName || "Unknown";

        if (!employerJobCounts.has(employerId)) {
          employerJobCounts.set(employerId, { name: employerName, jobCount: 0, applicationCount: 0 });
        }

        const employer = employerJobCounts.get(employerId)!;
        employer.jobCount++;
      });

      // Add application counts
      applications.forEach(app => {
        const employerId = app.employerId;
        if (employerJobCounts.has(employerId)) {
          employerJobCounts.get(employerId)!.applicationCount++;
        }
      });

      const topEmployers = Array.from(employerJobCounts.values())
        .sort((a, b) => b.jobCount - a.jobCount)
        .slice(0, 10);

      // Top locations
      const locationCounts = new Map<string, number>();
      jobs.forEach(job => {
        const location = job.location || "Unspecified";
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      });
      const topLocations = Array.from(locationCounts.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setAnalytics({
        totalUsers,
        communityMembers,
        employers,
        usersByMonth,
        totalJobs,
        activeJobs,
        jobsByMonth,
        jobsByEmploymentType,
        jobsWithSalary,
        totalApplications,
        applicationsByStatus,
        avgApplicationsPerJob,
        applicationRate,
        totalConferences,
        activeConferences,
        totalScholarships,
        activeScholarships,
        totalPowwows,
        activePowwows,
        totalVendors,
        activeVendors,
        featuredVendors,
        topEmployers,
        topLocations,
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
      .slice(-12); // Last 12 months
  }

  async function exportToCSV() {
    if (!analytics) return;

    const csvData = `IOPPS Platform Analytics Report
Generated: ${new Date().toLocaleString()}

=== USER METRICS ===
Total Users,${analytics.totalUsers}
Community Members,${analytics.communityMembers}
Employers,${analytics.employers}

=== JOB METRICS ===
Total Jobs,${analytics.totalJobs}
Active Jobs,${analytics.activeJobs}
Jobs with Salary Info,${analytics.jobsWithSalary}
Avg Applications per Job,${analytics.avgApplicationsPerJob}

=== APPLICATION METRICS ===
Total Applications,${analytics.totalApplications}
Application Rate (per active job),${analytics.applicationRate}

=== CONTENT METRICS ===
Conferences (Total/Active),${analytics.totalConferences}/${analytics.activeConferences}
Scholarships (Total/Active),${analytics.totalScholarships}/${analytics.activeScholarships}
Pow Wows (Total/Active),${analytics.totalPowwows}/${analytics.activePowwows}
Vendors (Total/Active/Featured),${analytics.totalVendors}/${analytics.activeVendors}/${analytics.featuredVendors}

=== TOP EMPLOYERS ===
${analytics.topEmployers.map(e => `${e.name},${e.jobCount} jobs,${e.applicationCount} applications`).join("\n")}

=== TOP LOCATIONS ===
${analytics.topLocations.map(l => `${l.location},${l.count} jobs`).join("\n")}
`;

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iopps-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-red-400">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
              >
                ← Admin Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Platform Analytics
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Comprehensive platform metrics and insights
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[#0F9488]"
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
          <h2 className="text-xl font-semibold text-foreground mb-4">Overview</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Users"
              value={analytics.totalUsers}
              subtitle={`${analytics.communityMembers} members, ${analytics.employers} employers`}
              color="blue"
            />
            <MetricCard
              label="Active Jobs"
              value={analytics.activeJobs}
              subtitle={`${analytics.totalJobs} total jobs`}
              color="purple"
            />
            <MetricCard
              label="Applications"
              value={analytics.totalApplications}
              subtitle={`${analytics.avgApplicationsPerJob} avg per job`}
              color="orange"
            />
            <MetricCard
              label="Application Rate"
              value={analytics.applicationRate}
              subtitle="per active job"
              color="green"
            />
          </div>
        </div>

        {/* User Growth */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">User Growth (Last 12 Months)</h2>
          <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
            <div className="space-y-3">
              {analytics.usersByMonth.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-[var(--text-muted)]">{month.month}</div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                        style={{
                          width: `${Math.min((month.count / Math.max(...analytics.usersByMonth.map(m => m.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-foreground">
                    {month.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Job Posting Trends */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Job Postings (Last 12 Months)</h2>
          <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
            <div className="space-y-3">
              {analytics.jobsByMonth.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-[var(--text-muted)]">{month.month}</div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                        style={{
                          width: `${Math.min((month.count / Math.max(...analytics.jobsByMonth.map(m => m.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-foreground">
                    {month.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Employment Types */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Jobs by Employment Type</h2>
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
              <div className="space-y-4">
                {analytics.jobsByEmploymentType.map((item) => (
                  <div key={item.type}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--text-secondary)]">{item.type}</span>
                      <span className="font-semibold text-foreground">
                        {item.count} ({Math.round((item.count / analytics.totalJobs) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488]"
                        style={{
                          width: `${(item.count / analytics.totalJobs) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Application Status Breakdown */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Applications by Status</h2>
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
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
            </div>
          </div>
        </div>

        {/* Content Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Content Metrics</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ContentMetricCard
              label="Conferences"
              total={analytics.totalConferences}
              active={analytics.activeConferences}
            />
            <ContentMetricCard
              label="Scholarships"
              total={analytics.totalScholarships}
              active={analytics.activeScholarships}
            />
            <ContentMetricCard
              label="Pow Wows"
              total={analytics.totalPowwows}
              active={analytics.activePowwows}
            />
            <ContentMetricCard
              label="Vendors"
              total={analytics.totalVendors}
              active={analytics.activeVendors}
              featured={analytics.featuredVendors}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top Employers */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Top Employers</h2>
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
              <div className="space-y-4">
                {analytics.topEmployers.map((employer, index) => (
                  <div key={employer.name} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-[var(--text-primary)]">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{employer.name}</div>
                      <div className="text-xs text-foreground0">
                        {employer.jobCount} jobs • {employer.applicationCount} applications
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Locations */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Top Job Locations</h2>
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
              <div className="space-y-4">
                {analytics.topLocations.map((location, index) => (
                  <div key={location.location} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{location.location}</div>
                      <div className="text-xs text-foreground0">{location.count} jobs</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  subtitle?: string;
  color: "blue" | "purple" | "orange" | "green";
}

function MetricCard({ label, value, subtitle, color }: MetricCardProps) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    green: "from-green-500 to-green-600",
  };

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-4xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-foreground0">{subtitle}</p>}
    </div>
  );
}

interface ContentMetricCardProps {
  label: string;
  total: number;
  active: number;
  featured?: number;
}

function ContentMetricCard({ label, total, active, featured }: ContentMetricCardProps) {
  const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{total}</p>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-green-400">Active: {active}</span>
          <span className="text-foreground0">{activePercentage}%</span>
        </div>
        {featured !== undefined && (
          <div className="text-xs text-yellow-400">Featured: {featured}</div>
        )}
      </div>
    </div>
  );
}
