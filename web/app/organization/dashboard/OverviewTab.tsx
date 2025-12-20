"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseIcon,
  DocumentTextIcon,
  UsersIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/AuthProvider";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import WelcomeWizard from "@/components/WelcomeWizard";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { StatCard, type DashboardSection } from "@/components/organization/dashboard";
import {
  getEmployerProfile,
  listEmployerJobs,
  listEmployerApplications,
  getUnreadMessageCount,
} from "@/lib/firestore";
import type { EmployerProfile, JobPosting, JobApplication } from "@/lib/types";

interface OverviewTabProps {
  onNavigate?: (section: DashboardSection) => void;
}

export default function OverviewTab({ onNavigate }: OverviewTabProps = {}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [profileData, jobsData, appsData, unreadCount] = await Promise.all([
        getEmployerProfile(user.uid),
        listEmployerJobs(user.uid),
        listEmployerApplications(user.uid),
        getUnreadMessageCount(user.uid, "employer"),
      ]);
      setProfile(profileData);
      setJobs(jobsData);
      setApplications(appsData);
      setUnreadMessages(unreadCount);

      // Check if user should see the welcome wizard
      const wizardKey = `iopps_welcome_wizard_${user.uid}`;
      const hasSeenWizard = localStorage.getItem(wizardKey);

      // Show wizard if user hasn't seen it and profile is new (pending or no description)
      if (!hasSeenWizard && profileData && (profileData.status === "pending" || !profileData.description)) {
        setShowWelcomeWizard(true);
      }
    } catch (err) {
      console.error("Error loading employer data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWizardComplete = () => {
    if (user) {
      const wizardKey = `iopps_welcome_wizard_${user.uid}`;
      localStorage.setItem(wizardKey, "true");
    }
    setShowWelcomeWizard(false);
  };

  const handleNavigate = (section: DashboardSection) => {
    if (onNavigate) {
      onNavigate(section);
    } else {
      // Fallback to custom event for backwards compatibility
      const event = new CustomEvent("switchSection", {
        detail: { section },
      });
      window.dispatchEvent(event);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.active !== false);
  const pendingApplications = applications.filter((a) => a.status === "submitted" || a.status === "reviewed");
  const recentApplications = applications.slice(0, 5);
  const totalViews = jobs.reduce((sum, j) => sum + (j.viewsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Wizard for new employers */}
      {showWelcomeWizard && (
        <WelcomeWizard onComplete={handleWizardComplete} organizationName={profile?.organizationName} />
      )}

      {/* Email Verification Banner */}
      <EmailVerificationBanner email={user?.email} emailVerified={user?.emailVerified ?? false} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BriefcaseIcon} value={activeJobs.length} label="Active Jobs" />
        <StatCard icon={UsersIcon} value={pendingApplications.length} label="New Applications" />
        <StatCard icon={EyeIcon} value={totalViews} label="Total Views" />
        <StatCard icon={ChatBubbleLeftRightIcon} value={unreadMessages} label="Unread Messages" />
      </div>

      {/* Organization Status Card */}
      {profile && (
        <div className="rounded-2xl bg-card border border-card-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile.logoUrl ? (
                <Image
                  src={profile.logoUrl}
                  alt={profile.organizationName || "Organization"}
                  width={64}
                  height={64}
                  className="rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white">
                  {profile.organizationName?.charAt(0) || "O"}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{profile.organizationName || "Your Organization"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                      profile.status === "active"
                        ? "bg-emerald-500"
                        : profile.status === "pending"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                    }`}
                  >
                    {profile.status === "active" ? "Active" : profile.status === "pending" ? "Pending" : "Draft"}
                  </span>
                  {profile.location && <span className="text-sm text-slate-500">{profile.location}</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleNavigate("profile")}
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Post a Job */}
          <Link
            href="/organization/jobs/new"
            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <PlusIcon className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="font-semibold text-white group-hover:text-blue-400">Post a Job</h4>
            </div>
            <p className="text-sm text-slate-400">Create a new job listing</p>
          </Link>

          {/* View Applications */}
          <button
            onClick={() => handleNavigate("applications")}
            className="p-4 rounded-xl bg-card border border-card-border hover:border-blue-500/50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-900/50">
                <DocumentTextIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-400" />
              </div>
              <h4 className="font-semibold text-white">Applications</h4>
            </div>
            <p className="text-sm text-slate-400">{pendingApplications.length} pending review</p>
          </button>

          {/* Search Talent */}
          <Link
            href="/organization/talent"
            className="p-4 rounded-xl bg-card border border-card-border hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-900/50">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-400" />
              </div>
              <h4 className="font-semibold text-white">Search Talent</h4>
            </div>
            <p className="text-sm text-slate-400">Find candidates</p>
          </Link>

          {/* Create Event Dropdown */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full p-4 rounded-xl bg-card border border-card-border hover:border-blue-500/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-900/50">
                  <CalendarDaysIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-400" />
                </div>
                <h4 className="font-semibold text-white flex items-center gap-2">
                  Create Event
                  <svg
                    className={`h-4 w-4 transition-transform ${showCreateMenu ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
              </div>
              <p className="text-sm text-slate-400">Pow wows, conferences</p>
            </button>

            {/* Dropdown Menu */}
            {showCreateMenu && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                <Link
                  href="/organization/powwows/new"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                >
                  <span className="text-xl">🎪</span>
                  <div>
                    <p className="font-medium">Pow Wow / Event</p>
                    <p className="text-xs text-slate-400">Cultural gatherings</p>
                  </div>
                </Link>
                <Link
                  href="/organization/scholarships/new"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                >
                  <AcademicCapIcon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Scholarship</p>
                    <p className="text-xs text-slate-400">Scholarships & grants</p>
                  </div>
                </Link>
                <Link
                  href="/organization/conferences/new"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                >
                  <ChartBarIcon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Conference</p>
                    <p className="text-xs text-slate-400">Announce conferences</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Applications</h3>
          <button
            onClick={() => handleNavigate("applications")}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All →
          </button>
        </div>

        {recentApplications.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-2 text-slate-400">No applications yet</p>
            <p className="mt-1 text-sm text-slate-500">Applications will appear here as candidates apply to your jobs</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
                    {app.memberDisplayName?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{app.memberDisplayName || "Anonymous"}</h4>
                    <p className="text-sm text-slate-500">{app.memberEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      app.status === "submitted" || app.status === "reviewed"
                        ? "bg-blue-500/20 text-blue-300"
                        : app.status === "hired" || app.status === "shortlisted"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {app.status || "submitted"}
                  </span>
                  {app.resumeUrl && (
                    <Link
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Resume →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist
        profile={profile}
        emailVerified={user?.emailVerified ?? false}
        hasJobs={jobs.length > 0}
        onTabChange={(tab) => {
          // Convert legacy tab names to sections
          const tabToSection: Record<string, DashboardSection> = {
            opportunities: "jobs",
            applications: "applications",
            profile: "profile",
          };
          handleNavigate(tabToSection[tab] || (tab as DashboardSection));
        }}
      />
    </div>
  );
}
