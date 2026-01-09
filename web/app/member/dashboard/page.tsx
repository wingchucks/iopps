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
import SettingsTab from "./SettingsTab";
import ProfileWizard from "@/components/member/ProfileWizard";
import OverviewTab, { ApplicationWithJob, TabType } from "./OverviewTab";



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
          <button
            onClick={() => setActiveTab("settings")}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${activeTab === "settings"
              ? "border-b-2 border-slate-400 text-slate-200"
              : "text-slate-400 hover:text-slate-300"
              }`}
          >
            Settings
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
          {activeTab === "profile" && <ProfileTab key={profile?.id} initialProfile={profile} onProfileUpdate={setProfile} />}
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
          {activeTab === "settings" && (
            <SettingsTab />
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


