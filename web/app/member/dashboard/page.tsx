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

type ApplicationWithJob = JobApplication & {
  job?: JobPosting | null;
};

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
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<ScholarshipApplication[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  // Check if user is a community member - anyone who is NOT employer/admin/moderator
  // This aligns with the SiteHeader logic for showing "My Dashboard" link
  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

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

        // Fetch job details for applications
        const appsWithJobs: ApplicationWithJob[] = [];
        for (const app of apps) {
          try {
            const job = await getJobPosting(app.jobId);
            appsWithJobs.push({ ...app, job });
          } catch (e) {
            appsWithJobs.push(app);
          }
        }
        setApplications(appsWithJobs);
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
              applications={applications}
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
  applications,
  onNavigate
}: {
  profile: MemberProfile | null;
  profileCompletion: number;
  stats: { totalApplications: number; recentApplications: number; profileCompletion: number };
  applications: ApplicationWithJob[];
  onNavigate: (tab: TabType) => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome & Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 shadow-lg shadow-emerald-900/10">
            <p className="text-sm font-medium text-emerald-400">Total Applications</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{stats.totalApplications}</span>
              {stats.recentApplications > 0 && (
                <span className="text-xs text-emerald-300">+{stats.recentApplications} new</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5 shadow-lg shadow-blue-900/10">
            <p className="text-sm font-medium text-blue-400">Profile Views</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">12</span>
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                +3 this week
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-5 shadow-lg shadow-amber-900/10">
            <p className="text-sm font-medium text-amber-400">New Matches</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">3</span>
            </div>
          </div>
        </div>

        {/* Application Tracker */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Application Tracker</h3>
            <button onClick={() => onNavigate("applications")} className="text-sm text-emerald-400 hover:text-emerald-300">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {applications.slice(0, 3).map((app) => (
              <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">
                    🏢
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-200 truncate">{app.job?.title || "Job Application"}</h4>
                    <p className="text-xs text-slate-500 truncate">{app.job?.employerName || "Employer"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-14 sm:pl-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'reviewed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    (app.status === 'hired' || app.status === 'shortlisted') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                    {app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : "Submitted"}
                  </span>
                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400">
                    →
                  </button>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No active applications. <Link href="/careers" className="text-emerald-400 underline">Start applying!</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (Goals) */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Recommended Goals</h3>

          <div className="space-y-5">
            {/* Goal 1: Profile */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Complete your portfolio</span>
                <span className="text-emerald-400">{profileCompletion}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
              </div>
              {profileCompletion < 100 && (
                <button onClick={() => onNavigate("profile")} className="mt-2 text-xs font-semibold text-slate-400 hover:text-white">
                  Continue →
                </button>
              )}
            </div>

            <hr className="border-slate-800" />

            {/* Goal 2: Networking */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Connect with 5 peers</span>
                <span className="text-slate-500">2/5</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 w-[40%]" />
              </div>
              <Link href="/network" className="mt-2 block text-xs font-semibold text-blue-400 hover:text-blue-300">
                Find Peers →
              </Link>
            </div>

            <hr className="border-slate-800" />

            {/* Goal 3: Events */}
            <div className="group cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  📅
                </div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-purple-400 transition-colors">Attend a Networking Event</p>
              </div>
              <Link href="/conferences" className="ml-11 text-xs text-slate-500 group-hover:text-slate-300">
                View upcoming events
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
