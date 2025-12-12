"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  UsersIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface StatValue {
  count: number;
  error?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    totalUsers: StatValue;
    totalJobs: StatValue;
    pendingEmployers: StatValue;
    activeJobs: StatValue;
  }>({
    totalUsers: { count: 0 },
    totalJobs: { count: 0 },
    pendingEmployers: { count: 0 },
    activeJobs: { count: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!db) {
        setLoading(false);
        return;
      }

      const results: typeof stats = {
        totalUsers: { count: 0 },
        totalJobs: { count: 0 },
        pendingEmployers: { count: 0 },
        activeJobs: { count: 0 }
      };

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

      // Active Jobs - use getDocs as fallback if index doesn't exist
      try {
        const activeJobsQuery = query(collection(db, "jobs"), where("active", "==", true));
        const activeJobsSnap = await getCountFromServer(activeJobsQuery);
        results.activeJobs = { count: activeJobsSnap.data().count };
      } catch (error) {
        console.error("Error fetching active jobs with index:", error);
        // Fallback: fetch all and count client-side
        try {
          const allJobsSnap = await getDocs(collection(db, "jobs"));
          const activeCount = allJobsSnap.docs.filter(doc => doc.data().active === true).length;
          results.activeJobs = { count: activeCount };
        } catch {
          results.activeJobs = { count: 0, error: "Failed to load" };
        }
      }

      // Pending Employers - use getDocs as fallback if index doesn't exist
      try {
        const pendingQuery = query(collection(db, "employers"), where("status", "==", "pending"));
        const pendingSnap = await getCountFromServer(pendingQuery);
        results.pendingEmployers = { count: pendingSnap.data().count };
      } catch (error) {
        console.error("Error fetching pending employers with index:", error);
        // Fallback: fetch all and count client-side
        try {
          const allEmployersSnap = await getDocs(collection(db, "employers"));
          const pendingCount = allEmployersSnap.docs.filter(doc => doc.data().status === "pending").length;
          results.pendingEmployers = { count: pendingCount };
        } catch {
          results.pendingEmployers = { count: 0, error: "Failed to load" };
        }
      }

      setStats(results);
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading dashboard stats...</div>;
  }

  const statCards = [
    { name: "Pending Employers", stat: stats.pendingEmployers, icon: ClockIcon, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { name: "Total Users", stat: stats.totalUsers, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Active Jobs", stat: stats.activeJobs, icon: CheckBadgeIcon, color: "text-green-500", bg: "bg-green-500/10" },
    { name: "Total Jobs Posted", stat: stats.totalJobs, icon: BriefcaseIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard Overview</h1>
        <p className="text-slate-400">Welcome to the IOPPS administration panel.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg border border-slate-800 bg-[#08090C] px-4 py-5 shadow sm:px-6 sm:pt-6"
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
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#08090C] p-6">
        <h2 className="text-lg font-medium text-slate-100">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <a href="/admin/users" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Manage Users
          </a>
          <a href="/admin/members" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Members (Job Seekers)
          </a>
          <a href="/admin/employers" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Employers
          </a>
          <a href="/admin/jobs" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Jobs
          </a>
          <a href="/admin/conferences" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Conferences
          </a>
          <a href="/admin/vendors" className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300 hover:border-[#14B8A6] hover:text-white transition">
            Shop Vendors
          </a>
        </div>
      </div>
    </div>
  );
}
