"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import WelcomeWizard from "@/components/WelcomeWizard";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import {
  getEmployerProfile,
  listEmployerJobs,
  listEmployerApplications,
  listEmployerConferences,
  listEmployerPowwows,
  getUnreadMessageCount,
} from "@/lib/firestore";
import type {
  EmployerProfile,
  JobPosting,
  JobApplication,
  Conference,
  PowwowEvent,
} from "@/lib/types";

export default function OverviewTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [events, setEvents] = useState<PowwowEvent[]>([]);
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileData, jobsData, appsData, confsData, eventsData, unreadCount] = await Promise.all([
          getEmployerProfile(user.uid),
          listEmployerJobs(user.uid),
          listEmployerApplications(user.uid),
          listEmployerConferences(user.uid),
          listEmployerPowwows(user.uid),
          getUnreadMessageCount(user.uid, "employer"),
        ]);
        setProfile(profileData);
        setJobs(jobsData);
        setApplications(appsData);
        setConferences(confsData);
        setEvents(eventsData);
        setUnreadMessages(unreadCount);

        // Check if user should see the welcome wizard
        const wizardKey = `iopps_welcome_wizard_${user.uid}`;
        const hasSeenWizard = localStorage.getItem(wizardKey);

        // Show wizard if user hasn't seen it and profile is new (pending or no description)
        if (!hasSeenWizard && profileData &&
            (profileData.status === "pending" || !profileData.description)) {
          setShowWelcomeWizard(true);
        }
      } catch (err) {
        console.error("Error loading employer data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleWizardComplete = () => {
    if (user) {
      const wizardKey = `iopps_welcome_wizard_${user.uid}`;
      localStorage.setItem(wizardKey, "true");
    }
    setShowWelcomeWizard(false);
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400">
        Loading your dashboard...
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.active !== false);
  const activeConferences = conferences.filter((c) => c.active !== false);
  const activeEvents = events.filter((e) => e.active !== false);
  const pendingApplications = applications.filter(
    (a) => a.status === "submitted" || a.status === "reviewed"
  );
  const recentApplications = applications.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Wizard for new employers */}
      {showWelcomeWizard && (
        <WelcomeWizard
          onComplete={handleWizardComplete}
          organizationName={profile?.organizationName}
        />
      )}

      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">
          Welcome back{profile?.organizationName ? `, ${profile.organizationName}` : ""}!
        </h2>
        <p className="mt-2 text-slate-400">
          Here's an overview of your opportunities and applicants.
        </p>
      </div>

      {/* Email Verification Banner */}
      <EmailVerificationBanner
        email={user?.email}
        emailVerified={user?.emailVerified ?? false}
      />

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6 shadow-xl shadow-emerald-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Active Jobs
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {activeJobs.length}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {jobs.length - activeJobs.length} paused
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-6 shadow-xl shadow-blue-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Total Applications
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {applications.length}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {pendingApplications.length} pending review
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-red-500/10 p-6 shadow-xl shadow-pink-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Pow Wows & Events
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {activeEvents.length}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {events.length - activeEvents.length} inactive
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-indigo-500/10 p-6 shadow-xl shadow-purple-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Conferences
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {activeConferences.length}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {conferences.length - activeConferences.length} inactive
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 p-6 shadow-xl shadow-orange-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Total Views
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {jobs.reduce((sum, j) => sum + (j.viewsCount || 0), 0)}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Across all jobs</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <h3 className="mb-6 text-xl font-semibold text-white">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Post a Job - Primary CTA */}
          <Link
            href="/organization/jobs/new"
            className="group rounded-xl border-2 border-teal-500/50 bg-gradient-to-br from-teal-500/30 to-emerald-500/20 p-6 transition-all hover:border-teal-400 hover:from-teal-500/40 hover:to-emerald-500/30 hover:shadow-lg hover:shadow-teal-500/20"
          >
            <div className="mb-2 text-2xl">💼</div>
            <h4 className="font-semibold text-teal-300 group-hover:text-teal-200">
              Post a Job
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Create job listing
            </p>
          </Link>

          {/* Create New Dropdown - For other opportunity types */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="group w-full rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-6 text-left transition-all hover:border-emerald-500/50 hover:from-emerald-500/30 hover:to-teal-500/20"
            >
              <div className="mb-2 text-2xl">➕</div>
              <h4 className="flex items-center gap-2 font-semibold text-white group-hover:text-emerald-400">
                Create New
                <svg
                  className={`h-4 w-4 transition-transform ${showCreateMenu ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                Events & more
              </p>
            </button>

            {/* Dropdown Menu */}
            {showCreateMenu && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                <Link
                  href="/organization/powwows/new"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-pink-500/20 hover:text-pink-300"
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
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-teal-500/20 hover:text-teal-300"
                >
                  <span className="text-xl">🎓</span>
                  <div>
                    <p className="font-medium">Scholarship</p>
                    <p className="text-xs text-slate-400">Scholarships & grants</p>
                  </div>
                </Link>
                <Link
                  href="/organization/conferences/new"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 transition-colors hover:bg-amber-500/20 hover:text-amber-300"
                >
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="font-medium">Conference</p>
                    <p className="text-xs text-slate-400">Announce conferences</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/organization/applications"
            className="group relative rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-6 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/20"
          >
            {pendingApplications.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">
                {pendingApplications.length > 9 ? "9+" : pendingApplications.length}
              </span>
            )}
            <div className="mb-2 text-2xl">📋</div>
            <h4 className="font-semibold text-white group-hover:text-cyan-400">
              Applications
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              {pendingApplications.length > 0 ? `${pendingApplications.length} pending` : "Review candidates"}
            </p>
          </Link>

          <Link
            href="/organization/messages"
            className="group relative rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            {unreadMessages > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
            <div className="mb-2 text-2xl">💬</div>
            <h4 className="font-semibold text-white group-hover:text-blue-400">
              Messages
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              {unreadMessages > 0 ? `${unreadMessages} unread` : "Chat with candidates"}
            </p>
          </Link>

          <Link
            href="/organization/analytics"
            className="group rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
          >
            <div className="mb-2 text-2xl">📊</div>
            <h4 className="font-semibold text-white group-hover:text-purple-400">
              Analytics
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              View performance metrics
            </p>
          </Link>

          <Link
            href="/organization/setup"
            className="group rounded-xl border border-slate-500/30 bg-slate-500/10 p-6 transition-all hover:border-slate-500/50 hover:bg-slate-500/20"
          >
            <div className="mb-2 text-2xl">⚙️</div>
            <h4 className="font-semibold text-white group-hover:text-slate-300">
              Settings
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Organization profile
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Recent Applications
          </h3>
          <Link
            href="/organization/dashboard"
            onClick={(e) => {
              e.preventDefault();
              // This will be handled by parent component to switch tabs
              const event = new CustomEvent("switchTab", {
                detail: { tab: "applications" },
              });
              window.dispatchEvent(event);
            }}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            View all →
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No applications yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Applications will appear here as candidates apply to your jobs
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {app.memberDisplayName || "Anonymous"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {app.memberEmail}
                    </p>
                  </div>
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
                </div>
                {app.resumeUrl && (
                  <Link
                    href={app.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    View resume →
                  </Link>
                )}
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
          const event = new CustomEvent("switchTab", { detail: { tab } });
          window.dispatchEvent(event);
        }}
      />
    </div>
  );
}
