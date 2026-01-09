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
        <StatCard
          icon={BriefcaseIcon}
          value={activeJobs.length}
          label="Active Jobs"
          className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          onClick={() => handleNavigate("jobs")}
        />
        <StatCard
          icon={UsersIcon}
          value={pendingApplications.length}
          label="New Applications"
          className="bg-blue-500/10 border-blue-500/20 text-blue-400"
          onClick={() => handleNavigate("applications")}
        />
        <StatCard
          icon={EyeIcon}
          value={totalViews}
          label="Total Views"
          className="bg-purple-500/10 border-purple-500/20 text-purple-400"
          onClick={() => handleNavigate("jobs")}
        />
        <StatCard
          icon={ChatBubbleLeftRightIcon}
          value={unreadMessages}
          label="Unread Messages"
          className="bg-amber-500/10 border-amber-500/20 text-amber-400"
          onClick={() => handleNavigate("messages")}
        />
      </div>

      {/* Organization Status Card */}
      {profile && (
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 sm:gap-0">
            <div className="flex items-center gap-6">
              {profile.logoUrl ? (
                <Image
                  src={profile.logoUrl}
                  alt={profile.organizationName || "Organization"}
                  width={80}
                  height={80}
                  className="rounded-2xl object-cover border-2 border-slate-700/50 shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white shadow-lg">
                  {profile.organizationName?.charAt(0) || "O"}
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{profile.organizationName || "Your Organization"}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${profile.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : profile.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.status === "approved" ? "bg-emerald-400" : profile.status === "pending" ? "bg-amber-400" : "bg-slate-400"}`} />
                    {profile.status === "approved" ? "Active" : profile.status === "pending" ? "Pending Approval" : "Draft"}
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-1 text-sm text-slate-400">
                      <span>📍</span> {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleNavigate("profile")}
              className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50 hover:border-slate-600"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/organization/jobs/new"
          className="group relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-xl bg-blue-500/20 p-3 text-blue-400">
              <PlusIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Post a Job</h4>
            <p className="mt-1 text-sm text-slate-400">Find your next hire</p>
          </div>
        </Link>

        <button
          onClick={() => handleNavigate("applications")}
          className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 text-left transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-500/20 p-3 text-emerald-400">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Review Applications</h4>
            <p className="mt-1 text-sm text-slate-400">{pendingApplications.length} candidates waiting</p>
          </div>
        </button>

        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="w-full text-left group relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-purple-500/20 p-3 text-purple-400">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors flex items-center justify-between">
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
              <p className="mt-1 text-sm text-slate-400">Host a gathering</p>
            </div>
          </button>
          {/* Dropdown Menu */}
          {showCreateMenu && (
            <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl p-2 shadow-2xl">
              <Link
                href="/organization/powwows/new"
                onClick={() => setShowCreateMenu(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-200 transition-colors hover:bg-purple-500/20 hover:text-purple-300"
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
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-200 transition-colors hover:bg-purple-500/20 hover:text-purple-300"
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
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-200 transition-colors hover:bg-purple-500/20 hover:text-purple-300"
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

        <Link
          href="/organization/talent"
          className="group relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-xl bg-amber-500/20 p-3 text-amber-400">
              <MagnifyingGlassIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Search Talent</h4>
            <p className="mt-1 text-sm text-slate-400">Browse the community</p>
          </div>
        </Link>
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
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 gap-4"
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
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${app.status === "submitted" || app.status === "reviewed"
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
