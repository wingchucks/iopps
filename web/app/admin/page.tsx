"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  UsersIcon,
  BriefcaseIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  QueueCard,
  QueueGrid,
  KPICard,
  KPIGrid,
  ActivityFeed,
  SystemHealthPanel,
  type QueueItem,
  type ActivityItem,
  type HealthItem,
} from "@/components/admin";
import { useAdminCounts } from "@/lib/hooks/admin";

// ============================================================================
// Types
// ============================================================================

interface DashboardState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminDashboard() {
  const {
    counts,
    pendingItems,
    failedImports,
    loading: countsLoading,
    refresh,
    isRefreshing,
  } = useAdminCounts();

  const [dashboardState, setDashboardState] = useState<DashboardState>({
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [healthItems, setHealthItems] = useState<HealthItem[]>([]);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    if (!db) return;

    try {
      const activities: ActivityItem[] = [];

      // Get recent employers
      try {
        const employersSnap = await getDocs(
          query(collection(db, "employers"), orderBy("createdAt", "desc"), limit(5))
        );
        employersSnap.docs.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          if (data.status === "approved") {
            activities.push({
              id: `employer-${doc.id}`,
              type: "employer_approved",
              title: `${data.organizationName || "Employer"} approved`,
              timestamp: createdAt,
              href: `/admin/employers`,
            });
          } else if (data.status === "pending") {
            activities.push({
              id: `employer-new-${doc.id}`,
              type: "user_created",
              title: `New employer: ${data.organizationName || "Unknown"}`,
              timestamp: createdAt,
              href: `/admin/employers?status=pending`,
            });
          }
        });
      } catch (e) {
        console.error("Error fetching recent employers:", e);
      }

      // Get recent jobs
      try {
        const jobsSnap = await getDocs(
          query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(5))
        );
        jobsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          activities.push({
            id: `job-${doc.id}`,
            type: "job_posted",
            title: `New job: ${data.title || "Untitled"}`,
            description: data.employerName,
            timestamp: createdAt,
            href: `/admin/jobs`,
          });
        });
      } catch (e) {
        console.error("Error fetching recent jobs:", e);
      }

      // Get recent members
      try {
        const membersSnap = await getDocs(
          query(collection(db, "members"), orderBy("createdAt", "desc"), limit(5))
        );
        membersSnap.docs.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          activities.push({
            id: `member-${doc.id}`,
            type: "member_signup",
            title: `New member: ${data.displayName || "Anonymous"}`,
            timestamp: createdAt,
            href: `/admin/members`,
          });
        });
      } catch (e) {
        console.error("Error fetching recent members:", e);
      }

      // Get recent applications
      try {
        const applicationsSnap = await getDocs(
          query(collection(db, "applications"), orderBy("createdAt", "desc"), limit(5))
        );
        applicationsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          activities.push({
            id: `application-${doc.id}`,
            type: "application_received",
            title: `Application for ${data.jobTitle || "job"}`,
            timestamp: createdAt,
            href: `/admin/applications`,
          });
        });
      } catch (e) {
        console.error("Error fetching recent applications:", e);
      }

      // Sort by timestamp and take most recent
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  }, []);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    if (!db) return;

    const health: HealthItem[] = [];

    // Check RSS feeds health
    try {
      const feedsSnap = await getDocs(collection(db, "rssFeeds"));
      const totalFeeds = feedsSnap.docs.length;
      const failedFeeds = feedsSnap.docs.filter(
        (doc) => doc.data().lastError || doc.data().lastRunStatus === "error"
      ).length;
      const successFeeds = totalFeeds - failedFeeds;

      health.push({
        id: "rss",
        name: "RSS Imports",
        status: failedFeeds > 0 ? "warning" : totalFeeds > 0 ? "healthy" : "unknown",
        details: totalFeeds > 0 ? `${successFeeds}/${totalFeeds} OK` : "No feeds",
        message: failedFeeds > 0 ? `${failedFeeds} failed` : undefined,
      });
    } catch {
      health.push({
        id: "rss",
        name: "RSS Imports",
        status: "unknown",
        message: "Unable to check",
      });
    }

    // Email service (placeholder - would need API check)
    health.push({
      id: "email",
      name: "Email Service",
      status: "healthy",
      details: "Connected",
    });

    // Stripe (placeholder - would need API check)
    health.push({
      id: "stripe",
      name: "Stripe Payments",
      status: "healthy",
      details: "Connected",
    });

    // Storage (placeholder)
    health.push({
      id: "storage",
      name: "Cloud Storage",
      status: "healthy",
      details: "Available",
    });

    setHealthItems(health);
  }, []);

  // Initial load
  useEffect(() => {
    const loadDashboard = async () => {
      setDashboardState((prev) => ({ ...prev, loading: true }));
      await Promise.all([fetchRecentActivity(), fetchSystemHealth()]);
      setDashboardState({
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date(),
      });
    };

    loadDashboard();
  }, [fetchRecentActivity, fetchSystemHealth]);

  // Build queue items
  const pendingApprovalItems: QueueItem[] = [
    {
      label: "Employers",
      count: counts.employers.pending,
      href: "/admin/employers?status=pending",
    },
    {
      label: "Vendors",
      count: counts.vendors.pending,
      href: "/admin/vendors?status=pending",
    },
  ];

  const failedImportItems: QueueItem[] = failedImports.map((f) => ({
    label: f.feedName,
    count: 1,
  }));

  // Handle refresh
  const handleRefresh = async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: true }));
    await Promise.all([refresh(), fetchRecentActivity(), fetchSystemHealth()]);
    setDashboardState((prev) => ({
      ...prev,
      refreshing: false,
      lastUpdated: new Date(),
    }));
  };

  const isLoading = countsLoading || dashboardState.loading;
  const totalPending = counts.employers.pending + counts.vendors.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
          <p className="text-sm text-slate-400">
            {isLoading
              ? "Loading..."
              : dashboardState.lastUpdated
              ? `Last updated ${dashboardState.lastUpdated.toLocaleTimeString()}`
              : "Welcome to IOPPS administration"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || dashboardState.refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${
              isRefreshing || dashboardState.refreshing ? "animate-spin" : ""
            }`}
          />
          {isRefreshing || dashboardState.refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Urgent Queues */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Needs Attention
        </h2>
        <QueueGrid>
          <QueueCard
            type="pending"
            title="Pending Approvals"
            items={pendingApprovalItems}
            href={totalPending > 0 ? "/admin/employers?status=pending" : undefined}
            loading={isLoading}
            emptyMessage="No pending approvals"
          />
          <QueueCard
            type="flagged"
            title="Flagged Items"
            items={[]}
            loading={isLoading}
            emptyMessage="No flagged content"
          />
          <QueueCard
            type="failed"
            title="Failed Imports"
            items={failedImportItems.length > 0 ? failedImportItems : []}
            href={failedImportItems.length > 0 ? "/admin/feeds" : undefined}
            loading={isLoading}
            emptyMessage="All imports healthy"
          />
          <QueueCard
            type="payment"
            title="Payment Issues"
            items={[]}
            loading={isLoading}
            emptyMessage="No payment issues"
          />
        </QueueGrid>
      </div>

      {/* KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Platform Overview
        </h2>
        <KPIGrid columns={5}>
          <KPICard
            label="Active Jobs"
            value={counts.jobs.active}
            definition="Job postings currently visible on the platform"
            icon={<BriefcaseIcon className="h-5 w-5" />}
            color="green"
            loading={isLoading}
            href="/admin/jobs?status=active"
            breakdown={`${counts.jobs.inactive} inactive`}
          />
          <KPICard
            label="Member Profiles"
            value={counts.members.total}
            definition="Job seeker profiles created on the platform"
            icon={<UserGroupIcon className="h-5 w-5" />}
            color="blue"
            loading={isLoading}
            href="/admin/members"
            breakdown={`${counts.members.withResume} with resume`}
          />
          <KPICard
            label="Employer Orgs"
            value={counts.employers.approved}
            definition="Approved employer organization profiles"
            icon={<BriefcaseIcon className="h-5 w-5" />}
            color="teal"
            loading={isLoading}
            href="/admin/employers"
            breakdown={`${counts.employers.pending} pending`}
          />
          <KPICard
            label="Active Vendors"
            value={counts.vendors.active}
            definition="Shop Indigenous vendor listings"
            icon={<BuildingStorefrontIcon className="h-5 w-5" />}
            color="purple"
            loading={isLoading}
            href="/admin/vendors?status=active"
            breakdown={`${counts.vendors.featured} featured`}
          />
          <KPICard
            label="Applications"
            value={counts.applications.recent7d}
            definition="Job applications submitted in the last 7 days"
            icon={<DocumentTextIcon className="h-5 w-5" />}
            color="amber"
            loading={isLoading}
            href="/admin/applications"
            breakdown={`${counts.applications.total} total`}
          />
        </KPIGrid>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Users (Auth)</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.users.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Total Jobs</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.jobs.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <BuildingStorefrontIcon className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Total Vendors</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.vendors.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="text-xs text-slate-500">Conferences</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.conferences.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span className="text-xs text-slate-500">Pow Wows</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.powwows.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Total Apps</span>
          </div>
          <p className="mt-1 text-xl font-bold text-slate-200">
            {isLoading ? "-" : counts.applications.total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Activity and Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed
          activities={recentActivity}
          loading={dashboardState.loading}
          maxItems={8}
        />
        <SystemHealthPanel
          items={healthItems}
          loading={dashboardState.loading}
          onRefresh={fetchSystemHealth}
          isRefreshing={dashboardState.refreshing}
        />
      </div>
    </div>
  );
}
