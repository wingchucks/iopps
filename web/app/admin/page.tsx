"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  UsersIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    pendingEmployers: 0,
    activeJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        if (!db) return;

        // Total Users
        const usersSnap = await getCountFromServer(collection(db, "users"));

        // Total Jobs
        const jobsSnap = await getCountFromServer(collection(db, "jobs"));

        // Active Jobs
        const activeJobsQuery = query(collection(db, "jobs"), where("active", "==", true));
        const activeJobsSnap = await getCountFromServer(activeJobsQuery);

        // Pending Employers
        // Note: This requires an index on 'status', which might not exist yet.
        // If it fails, we might need to fetch docs and count client-side for now, 
        // or ensure the index is created.
        const pendingEmployersQuery = query(collection(db, "employers"), where("status", "==", "pending"));
        const pendingEmployersSnap = await getCountFromServer(pendingEmployersQuery);

        setStats({
          totalUsers: usersSnap.data().count,
          totalJobs: jobsSnap.data().count,
          activeJobs: activeJobsSnap.data().count,
          pendingEmployers: pendingEmployersSnap.data().count
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading dashboard stats...</div>;
  }

  const statCards = [
    { name: "Pending Employers", value: stats.pendingEmployers, icon: ClockIcon, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { name: "Total Users", value: stats.totalUsers, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Active Jobs", value: stats.activeJobs, icon: CheckBadgeIcon, color: "text-green-500", bg: "bg-green-500/10" },
    { name: "Total Jobs Posted", value: stats.totalJobs, icon: BriefcaseIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
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
              <p className="text-2xl font-semibold text-slate-100">
                {item.value}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#08090C] p-6">
        <h2 className="text-lg font-medium text-slate-100">Recent Activity</h2>
        <div className="mt-4 text-sm text-slate-400">
          Activity log coming soon...
        </div>
      </div>
    </div>
  );
}
