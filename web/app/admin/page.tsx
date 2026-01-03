"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getCountFromServer, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import {
  UsersIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface StatValue {
  count: number;
  error?: string;
}

interface PendingItem {
  id: string;
  name: string;
  type: "employer" | "vendor" | "conference";
  createdAt?: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    totalUsers: StatValue;
    totalJobs: StatValue;
    pendingEmployers: StatValue;
    activeJobs: StatValue;
    totalMembers: StatValue;
    totalEmployers: StatValue;
    totalVendors: StatValue;
    pendingVendors: StatValue;
    totalConferences: StatValue;
    totalApplications: StatValue;
  }>({
    totalUsers: { count: 0 },
    totalJobs: { count: 0 },
    pendingEmployers: { count: 0 },
    activeJobs: { count: 0 },
    totalMembers: { count: 0 },
    totalEmployers: { count: 0 },
    totalVendors: { count: 0 },
    pendingVendors: { count: 0 },
    totalConferences: { count: 0 },
    totalApplications: { count: 0 },
  });
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      if (!db) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const results: typeof stats = {
        totalUsers: { count: 0 },
        totalJobs: { count: 0 },
        pendingEmployers: { count: 0 },
        activeJobs: { count: 0 },
        totalMembers: { count: 0 },
        totalEmployers: { count: 0 },
        totalVendors: { count: 0 },
        pendingVendors: { count: 0 },
        totalConferences: { count: 0 },
        totalApplications: { count: 0 },
      };

      const pending: PendingItem[] = [];

      // Fetch each stat independently so one failure doesn't break all stats

      // Total Users
      try {
        const usersSnap = await getCountFromServer(collection(db, "users"));
        results.totalUsers = { count: usersSnap.data().count };
      } catch (error) {
        console.error("Error fetching total users:", error);
        results.totalUsers = { count: 0, error: "Failed to load" };
      }

      // Total Jobs
      try {
        const jobsSnap = await getCountFromServer(collection(db, "jobs"));
        results.totalJobs = { count: jobsSnap.data().count };
      } catch (error) {
        console.error("Error fetching total jobs:", error);
        results.totalJobs = { count: 0, error: "Failed to load" };
      }

      // Active Jobs
      try {
        const activeJobsQuery = query(collection(db, "jobs"), where("active", "==", true));
        const activeJobsSnap = await getCountFromServer(activeJobsQuery);
        results.activeJobs = { count: activeJobsSnap.data().count };
      } catch (error) {
        console.error("Error fetching active jobs with index:", error);
        try {
          const allJobsSnap = await getDocs(collection(db, "jobs"));
          const activeCount = allJobsSnap.docs.filter(doc => doc.data().active === true).length;
          results.activeJobs = { count: activeCount };
        } catch {
          results.activeJobs = { count: 0, error: "Failed to load" };
        }
      }

      // Pending Employers
      try {
        const pendingQuery = query(collection(db, "employers"), where("status", "==", "pending"));
        const pendingSnap = await getDocs(pendingQuery);
        // Filter out soft-deleted employers
        const activePendingDocs = pendingSnap.docs.filter(doc => !doc.data().deletedAt);
        results.pendingEmployers = { count: activePendingDocs.length };

        // Add to pending items
        activePendingDocs.slice(0, 5).forEach(doc => {
          const data = doc.data();
          pending.push({
            id: doc.id,
            name: data.organizationName || data.email || "Unknown Employer",
            type: "employer",
            createdAt: data.createdAt?.toDate?.() || undefined,
          });
        });
      } catch (error) {
        console.error("Error fetching pending employers:", error);
        results.pendingEmployers = { count: 0, error: "Failed to load" };
      }

      // Total Employers
      try {
        const employersSnap = await getCountFromServer(collection(db, "employers"));
        results.totalEmployers = { count: employersSnap.data().count };
      } catch (error) {
        console.error("Error fetching total employers:", error);
        results.totalEmployers = { count: 0, error: "Failed to load" };
      }

      // Total Members (community users)
      try {
        const membersQuery = query(collection(db, "users"), where("role", "==", "community"));
        const membersSnap = await getCountFromServer(membersQuery);
        results.totalMembers = { count: membersSnap.data().count };
      } catch (error) {
        console.error("Error fetching members:", error);
        try {
          const allUsersSnap = await getDocs(collection(db, "users"));
          const memberCount = allUsersSnap.docs.filter(doc => doc.data().role === "community").length;
          results.totalMembers = { count: memberCount };
        } catch {
          results.totalMembers = { count: 0, error: "Failed to load" };
        }
      }

      // Total Vendors
      try {
        const vendorsSnap = await getCountFromServer(collection(db, "vendors"));
        results.totalVendors = { count: vendorsSnap.data().count };
      } catch (error) {
        console.error("Error fetching total vendors:", error);
        results.totalVendors = { count: 0, error: "Failed to load" };
      }

      // Pending Vendors
      try {
        const pendingVendorsQuery = query(collection(db, "vendors"), where("status", "==", "pending"));
        const pendingVendorsSnap = await getDocs(pendingVendorsQuery);
        results.pendingVendors = { count: pendingVendorsSnap.docs.length };

        // Add to pending items
        pendingVendorsSnap.docs.slice(0, 5).forEach(doc => {
          const data = doc.data();
          pending.push({
            id: doc.id,
            name: data.businessName || "Unknown Vendor",
            type: "vendor",
            createdAt: data.createdAt?.toDate?.() || undefined,
          });
        });
      } catch (error) {
        console.error("Error fetching pending vendors:", error);
        results.pendingVendors = { count: 0, error: "Failed to load" };
      }

      // Total Conferences
      try {
        const conferencesSnap = await getCountFromServer(collection(db, "conferences"));
        results.totalConferences = { count: conferencesSnap.data().count };
      } catch (error) {
        console.error("Error fetching conferences:", error);
        results.totalConferences = { count: 0, error: "Failed to load" };
      }

      // Total Applications
      try {
        const applicationsSnap = await getCountFromServer(collection(db, "applications"));
        results.totalApplications = { count: applicationsSnap.data().count };
      } catch (error) {
        console.error("Error fetching applications:", error);
        results.totalApplications = { count: 0, error: "Failed to load" };
      }

      // Sort pending items by date (newest first)
      pending.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setStats(results);
      setPendingItems(pending.slice(0, 5));
      setLoading(false);
      setRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh when window gains focus (e.g., after approving an employer in another tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchStats(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading dashboard stats...</div>
      </div>
    );
  }

  const totalPending = stats.pendingEmployers.count + stats.pendingVendors.count;

  const primaryStats: Array<{ name: string; stat: StatValue; icon: typeof ClockIcon; color: string; bg: string; href?: string; pulse?: boolean }> = [
    { name: "Pending Review", stat: { count: totalPending }, icon: ClockIcon, color: "text-amber-500", bg: "bg-amber-500/10", href: totalPending > 0 ? (stats.pendingEmployers.count > 0 ? "/admin/employers?status=pending" : "/admin/vendors?status=pending") : undefined, pulse: totalPending > 0 },
    { name: "Active Jobs", stat: stats.activeJobs, icon: CheckBadgeIcon, color: "text-green-500", bg: "bg-green-500/10", href: "/admin/jobs" },
    { name: "Total Members", stat: stats.totalMembers, icon: UserGroupIcon, color: "text-blue-500", bg: "bg-blue-500/10", href: "/admin/members" },
    { name: "Applications", stat: stats.totalApplications, icon: DocumentTextIcon, color: "text-purple-500", bg: "bg-purple-500/10", href: "/admin/applications" },
  ];

  const secondaryStats = [
    { name: "Total Users", stat: stats.totalUsers, icon: UsersIcon, href: "/admin/users" },
    { name: "Employers", stat: stats.totalEmployers, icon: BriefcaseIcon, href: "/admin/employers" },
    { name: "Vendors", stat: stats.totalVendors, icon: BuildingStorefrontIcon, href: "/admin/vendors" },
    { name: "Conferences", stat: stats.totalConferences, icon: BuildingOfficeIcon, href: "/admin/conferences" },
    { name: "Total Jobs", stat: stats.totalJobs, icon: BriefcaseIcon, href: "/admin/jobs" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard Overview</h1>
          <p className="text-slate-400">Welcome to the IOPPS administration panel.</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((item) => (
          <Link
            key={item.name}
            href={item.href || "#"}
            className={`relative overflow-hidden rounded-lg border border-slate-800 bg-[#08090C] px-4 py-5 shadow transition hover:border-slate-700 sm:px-6 sm:pt-6 ${item.pulse ? "animate-pulse" : ""}`}
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-slate-400">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
              {item.stat.error ? (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {item.stat.error}
                </div>
              ) : (
                <p className="text-2xl font-semibold text-slate-100">
                  {item.stat.count}
                </p>
              )}
            </dd>
          </Link>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {secondaryStats.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="rounded-lg border border-slate-800 bg-[#08090C] p-4 transition hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">{item.name}</p>
                {item.stat.error ? (
                  <p className="text-sm text-red-400">Error</p>
                ) : (
                  <p className="text-lg font-semibold text-slate-200">{item.stat.count}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Needs Attention Section */}
      {pendingItems.length > 0 && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-medium text-amber-400">Needs Attention</h2>
          </div>
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === "employer" ? `/admin/employers?status=pending` : `/admin/vendors?status=pending`}
                className="flex items-center justify-between rounded-md border border-amber-800/30 bg-amber-950/30 p-3 transition hover:bg-amber-950/50"
              >
                <div className="flex items-center gap-3">
                  {item.type === "employer" ? (
                    <BriefcaseIcon className="h-5 w-5 text-amber-500" />
                  ) : (
                    <BuildingStorefrontIcon className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Pending {item.type} • {item.createdAt ? item.createdAt.toLocaleDateString() : "Unknown date"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                  Review
                </span>
              </Link>
            ))}
          </div>
          {totalPending > 5 && (
            <p className="mt-3 text-sm text-amber-500/70">
              +{totalPending - 5} more items need review
            </p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-lg border border-slate-800 bg-[#08090C] p-6">
        <h2 className="text-lg font-medium text-slate-100">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link href="/admin/users" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Manage Users
          </Link>
          <Link href="/admin/members" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Members (Job Seekers)
          </Link>
          <Link href="/admin/employers" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Employers
          </Link>
          <Link href="/admin/jobs" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Jobs
          </Link>
          <Link href="/admin/conferences" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Conferences
          </Link>
          <Link href="/admin/vendors" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Shop Vendors
          </Link>
        </div>
      </div>
    </div>
  );
}
