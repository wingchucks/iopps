"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
  getMemberProfile,
  listMemberApplications,
  getJobPosting,
  listMemberScholarshipApplications,
  getScholarship,
  getUnreadMessageCount,
  upsertMemberProfile
} from "@/lib/firestore";
import type {
  MemberProfile,
  JobApplication,
  JobPosting,
  ScholarshipApplication,
  Scholarship
} from "@/lib/types";

// Import the profile component content
import ProfileTab from "./ProfileTab";
import ApplicationsTab from "./ApplicationsTab";
import SavedItemsTab from "./SavedItemsTab";
import JobAlertsTab from "./JobAlertsTab";
import MessagesTab from "./MessagesTab";
import TrainingTab from "./TrainingTab";
import ProfileWizard from "@/components/member/ProfileWizard";

type TabType = "overview" | "profile" | "applications" | "saved" | "training" | "alerts" | "messages";

export default function MemberDashboard() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<ScholarshipApplication[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  // Check if user is a community member - must be explicitly "community" role
  const isCommunityMember = role === "community";

  // Load all data
  useEffect(() => {
    if (!user || !isCommunityMember) {
      setDataLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [profileData, apps, scholarshipApps, unreadCount] = await Promise.all([
          getMemberProfile(user.uid),
          listMemberApplications(user.uid),
          listMemberScholarshipApplications(user.uid),
          getUnreadMessageCount(user.uid, "member"),
        ]);

        setProfile(profileData);
        setApplications(apps);
        setScholarshipApplications(scholarshipApps);
        setUnreadMessageCount(unreadCount);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [user, role, isCommunityMember]);

  // Handle Wizard Dismissal
  const handleWizardDismiss = async () => {
    setShowWizard(false);
    if (user) {
      // Persist dismissal
      await upsertMemberProfile(user.uid, { wizardDismissed: true });
      // Update local profile state to reflect change
      setProfile(prev => prev ? { ...prev, wizardDismissed: true } : null);
    }
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    // Refresh data logic could go here, or just let the user navigate
    // For now, we'll just close it. Profile update inside wizard should have saved data.
    if (user) {
      // Reload profile to reflect changes
      getMemberProfile(user.uid).then(setProfile);
    }
  };

  // Calculate profile completeness
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.displayName,
      profile.location,
      profile.skills && profile.skills.length > 0 ? "skills" : "",
      profile.experience && profile.experience.length > 0 ? "experience" : "",
      profile.education && profile.education.length > 0 ? "education" : "",
      profile.resumeUrl,
      profile.indigenousAffiliation,
      profile.messagingHandle,
      profile.availableForInterviews,
    ];
    const filled = fields.filter((field) => field && field.toString().trim().length > 0).length;
    return Math.round((filled / fields.length) * 100) || 0;
  }, [profile]);

  // Show Wizard Logic
  useEffect(() => {
    if (!profile || dataLoading) return;

    // Show wizard if completion < 40% and NOT dismissed
    if (profileCompletion < 40 && !profile.wizardDismissed) {
      setShowWizard(true);
    }
  }, [profile, profileCompletion, dataLoading]);

  // Recent activity stats
  const recentStats = useMemo(() => {
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentApps = applications.filter((app) => {
      const date = app.createdAt;
      if (!date) return false;
      const timestamp = typeof date === 'object' && 'toDate' in date ? date.toDate().getTime() : new Date(date).getTime();
      return timestamp >= last30Days;
    });

    return {
      totalApplications: applications.length + scholarshipApplications.length,
      recentApplications: recentApps.length,
      profileCompletion,
    };
  }, [applications, scholarshipApplications, profileCompletion]);

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-emerald-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!user || !isCommunityMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-slate-400">Please sign in as a community member to access your dashboard.</p>
          <Link href="/login" className="mt-4 inline-block text-emerald-400 hover:text-emerald-300">
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          <p className="mt-2 text-slate-400">Manage your profile, applications, and saved items</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab("overview")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "overview"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "profile"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`relative whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "applications"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Applications
            {recentStats.totalApplications > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                {recentStats.totalApplications}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "saved"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Saved Items
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "training"
              ? "border-b-2 border-amber-500 text-amber-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Training
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "alerts"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Job Alerts
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`relative whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "messages"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Messages
            {unreadMessageCount > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                {unreadMessageCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && (
            <OverviewTab
              profile={profile}
              profileCompletion={profileCompletion}
              stats={recentStats}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "applications" && <ApplicationsTab />}
          {activeTab === "saved" && (
            <SavedItemsTab />
          )}
          {activeTab === "training" && (
            <TrainingTab />
          )}

          {activeTab === "alerts" && (
            <JobAlertsTab />
          )}
          {activeTab === "messages" && (
            <MessagesTab />
          )}
        </div>
      </div>
      <ProfileWizard
        isOpen={showWizard}
        onClose={handleWizardDismiss}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  profile,
  profileCompletion,
  stats,
  onNavigate
}: {
  profile: MemberProfile | null;
  profileCompletion: number;
  stats: { totalApplications: number; recentApplications: number; profileCompletion: number };
  onNavigate: (tab: TabType) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {profile?.displayName || "Member"}!
        </h2>
        <p className="mt-2 text-slate-400">
          Here's what's happening with your account
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Profile Completeness */}
        <button
          onClick={() => onNavigate("profile")}
          className="group rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6 shadow-xl shadow-emerald-900/20 transition-all hover:shadow-emerald-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-slate-400">Profile Completeness</p>
              <p className="mt-2 text-3xl font-bold text-white">{profileCompletion}%</p>
              <p className="mt-1 text-xs text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                View profile →
              </p>
            </div>
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90 transform">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - profileCompletion / 100)}`}
                  className="text-emerald-400 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* Total Applications */}
        <button
          onClick={() => onNavigate("applications")}
          className="group rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-6 shadow-xl shadow-blue-900/20 transition-all hover:shadow-blue-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-slate-400">Total Applications</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.totalApplications}</p>
              <p className="mt-1 text-xs text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100">
                View applications →
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Recent Activity */}
        <button
          onClick={() => onNavigate("applications")}
          className="group rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-6 shadow-xl shadow-purple-900/20 transition-all hover:shadow-purple-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-slate-400">Last 30 Days</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.recentApplications}</p>
              <p className="mt-1 text-xs text-purple-400">New applications</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h3 className="text-xl font-bold text-white">Quick Actions</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/careers"
            className="group rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Browse Jobs</p>
                <p className="text-sm text-slate-400">Find new opportunities</p>
              </div>
            </div>
          </Link>

          <Link
            href="/careers/programs"
            className="group rounded-xl border border-amber-500/20 bg-slate-900/50 p-4 transition-all hover:border-amber-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Training Programs</p>
                <p className="text-sm text-slate-400">Build new skills</p>
              </div>
            </div>
          </Link>

          <button
            onClick={() => onNavigate("profile")}
            className="group rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Update Profile</p>
                <p className="text-sm text-slate-400">Keep your info current</p>
              </div>
            </div>
          </button>

          <Link
            href="/conferences"
            className="group rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">View Conferences</p>
                <p className="text-sm text-slate-400">Networking events</p>
              </div>
            </div>
          </Link>

          <Link
            href="/education/scholarships"
            className="group rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Find Scholarships</p>
                <p className="text-sm text-slate-400">Education funding</p>
              </div>
            </div>
          </Link>

          <Link
            href="/member/email-preferences"
            className="group rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Email Preferences</p>
                <p className="text-sm text-slate-400">Manage notifications</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Profile Completion Nudge */}
      {profileCompletion < 100 && (
        <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/20">
              <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white">Complete Your Profile</h4>
              <p className="mt-1 text-sm text-slate-300">
                Your profile is {profileCompletion}% complete. Add more details to stand out to employers and increase your chances of getting hired.
              </p>
              <button
                onClick={() => onNavigate("profile")}
                className="mt-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:shadow-lg hover:shadow-yellow-500/30"
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
