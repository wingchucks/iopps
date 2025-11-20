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
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DashboardStats {
  totalUsers: number;
  communityMembers: number;
  employers: number;
  pendingEmployers: number;
  approvedEmployers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalConferences: number;
  totalScholarships: number;
  totalPowwows: number;
  totalVendors: number;
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    communityMembers: 0,
    employers: 0,
    pendingEmployers: 0,
    approvedEmployers: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalConferences: 0,
    totalScholarships: 0,
    totalPowwows: 0,
    totalVendors: 0,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadDashboardStats();
  }, [user, role, authLoading, router]);

  async function loadDashboardStats() {
    try {
      setLoading(true);

      // Get total users
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      const totalUsers = usersSnap.size;

      // Count by role
      let communityMembers = 0;
      let employers = 0;
      usersSnap.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === "community") communityMembers++;
        if (userData.role === "employer") employers++;
      });

      // Get employer profiles with status
      const employersRef = collection(db, "employers");
      const employersSnap = await getDocs(employersRef);
      let pendingEmployers = 0;
      let approvedEmployers = 0;
      employersSnap.forEach((doc) => {
        const empData = doc.data();
        if (empData.status === "pending") pendingEmployers++;
        if (empData.status === "approved") approvedEmployers++;
        // If no status field, count as approved (legacy data)
        if (!empData.status) approvedEmployers++;
      });

      // Get jobs
      const jobsRef = collection(db, "jobs");
      const jobsSnap = await getDocs(jobsRef);
      const totalJobs = jobsSnap.size;
      const activeJobs = jobsSnap.docs.filter(
        (doc) => doc.data().active === true
      ).length;

      // Get applications
      const applicationsRef = collection(db, "applications");
      const applicationsSnap = await getDocs(applicationsRef);
      const totalApplications = applicationsSnap.size;

      // Get conferences
      const conferencesRef = collection(db, "conferences");
      const conferencesSnap = await getDocs(conferencesRef);
      const totalConferences = conferencesSnap.size;

      // Get scholarships
      const scholarshipsRef = collection(db, "scholarships");
      const scholarshipsSnap = await getDocs(scholarshipsRef);
      const totalScholarships = scholarshipsSnap.size;

      // Get powwows
      const powwowsRef = collection(db, "powwows");
      const powwowsSnap = await getDocs(powwowsRef);
      const totalPowwows = powwowsSnap.size;

      // Get vendors
      const vendorsRef = collection(db, "vendors");
      const vendorsSnap = await getDocs(vendorsRef);
      const totalVendors = vendorsSnap.size;

      setStats({
        totalUsers,
        communityMembers,
        employers,
        pendingEmployers,
        approvedEmployers,
        totalJobs,
        activeJobs,
        totalApplications,
        totalConferences,
        totalScholarships,
        totalPowwows,
        totalVendors,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      link: "/admin/users",
    },
    {
      label: "Community Members",
      value: stats.communityMembers,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-[#14B8A6]",
      bgColor: "bg-[#14B8A6]/10",
      link: "/admin/users?role=community",
    },
    {
      label: "Pending Employers",
      value: stats.pendingEmployers,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      link: "/admin/employers?status=pending",
      highlight: stats.pendingEmployers > 0,
    },
    {
      label: "Approved Employers",
      value: stats.approvedEmployers,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      link: "/admin/employers?status=approved",
    },
    {
      label: "Total Jobs",
      value: stats.totalJobs,
      subtitle: `${stats.activeJobs} active`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      link: "/admin/jobs",
    },
    {
      label: "Applications",
      value: stats.totalApplications,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      link: "/admin/applications",
    },
    {
      label: "Conferences",
      value: stats.totalConferences,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      link: "/admin/conferences",
    },
    {
      label: "Scholarships",
      value: stats.totalScholarships,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      link: "/admin/scholarships",
    },
    {
      label: "Pow Wows",
      value: stats.totalPowwows,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      link: "/admin/powwows",
    },
    {
      label: "Vendors",
      value: stats.totalVendors,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      link: "/admin/vendors",
    },
  ];

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                Admin Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">
                Platform Overview
              </h1>
            </div>
            <Link
              href="/"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              ← Back to Site
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Quick Actions */}
        {stats.pendingEmployers > 0 && (
          <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <div className="flex items-start gap-4">
              <svg
                className="h-6 w-6 flex-shrink-0 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-100">
                  Action Required: {stats.pendingEmployers} Pending Employer
                  {stats.pendingEmployers !== 1 ? "s" : ""}
                </h3>
                <p className="mt-1 text-sm text-yellow-200/80">
                  Employers are waiting for approval before they can post jobs and
                  opportunities.
                </p>
                <Link
                  href="/admin/employers?status=pending"
                  className="mt-3 inline-flex rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-400"
                >
                  Review Pending Employers →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.link}
              className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-slate-700 hover:bg-slate-900 ${
                stat.highlight ? "ring-2 ring-yellow-500/30" : ""
              }`}
            >
              <div className={`flex items-center gap-3 ${stat.bgColor} rounded-lg p-3 w-fit`}>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-50">{stat.value}</p>
                {stat.subtitle && (
                  <p className="mt-1 text-xs text-slate-500">{stat.subtitle}</p>
                )}
              </div>
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <svg
                  className="h-5 w-5 text-[#14B8A6]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-50">Quick Links</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/analytics"
              className="rounded-xl border border-slate-800 bg-gradient-to-br from-[#14B8A6]/10 to-[#0D9488]/10 p-4 text-sm transition hover:border-[#14B8A6] hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 font-medium text-[#14B8A6]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Platform Analytics
              </div>
              <p className="mt-1 text-xs text-slate-500">
                View comprehensive platform metrics and insights
              </p>
            </Link>
            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm transition hover:border-[#14B8A6] hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </div>
              <p className="mt-1 text-xs text-slate-500">
                View and manage all user accounts
              </p>
            </Link>
            <Link
              href="/admin/employers"
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm transition hover:border-[#14B8A6] hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Employer Approvals
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Approve or reject employer applications
              </p>
            </Link>
            <Link
              href="/admin/content"
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm transition hover:border-[#14B8A6] hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Content Moderation
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Review and moderate platform content
              </p>
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm transition hover:border-[#14B8A6] hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Platform Settings
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Configure platform settings and preferences
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
