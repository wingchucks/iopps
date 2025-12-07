"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
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
      } catch (err) {
        console.error("Error loading employer data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

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
      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">
          Welcome back{profile?.organizationName ? `, ${profile.organizationName}` : ""}!
        </h2>
        <p className="mt-2 text-slate-400">
          Here's an overview of your opportunities and applicants.
        </p>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/organization/jobs/new"
            className="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
          >
            <div className="mb-2 text-2xl">💼</div>
            <h4 className="font-semibold text-white group-hover:text-emerald-400">
              Post a Job
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Share new opportunities
            </p>
          </Link>

          <Link
            href="/organization/talent"
            className="group rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-6 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/20"
          >
            <div className="mb-2 text-2xl">🔍</div>
            <h4 className="font-semibold text-white group-hover:text-cyan-400">
              Search Talent
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Find qualified candidates
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
        </div>

        {/* Secondary Actions */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/organization/events/new"
            className="group rounded-xl border border-pink-500/30 bg-pink-500/10 p-6 transition-all hover:border-pink-500/50 hover:bg-pink-500/20"
          >
            <div className="mb-2 text-2xl">🎪</div>
            <h4 className="font-semibold text-white group-hover:text-pink-400">
              Post Event
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Pow wows & gatherings
            </p>
          </Link>

          <Link
            href="/organization/scholarships/new"
            className="group rounded-xl border border-teal-500/30 bg-teal-500/10 p-6 transition-all hover:border-teal-500/50 hover:bg-teal-500/20"
          >
            <div className="mb-2 text-2xl">🎓</div>
            <h4 className="font-semibold text-white group-hover:text-teal-400">
              Post Scholarship
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Scholarships & grants
            </p>
          </Link>

          <Link
            href="/organization/conferences/new"
            className="group rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 transition-all hover:border-amber-500/50 hover:bg-amber-500/20"
          >
            <div className="mb-2 text-2xl">📅</div>
            <h4 className="font-semibold text-white group-hover:text-amber-400">
              Post Conference
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Announce conferences
            </p>
          </Link>

          <Link
            href="/organization/setup"
            className="group rounded-xl border border-slate-500/30 bg-slate-500/10 p-6 transition-all hover:border-slate-500/50 hover:bg-slate-500/20"
          >
            <div className="mb-2 text-2xl">⚙️</div>
            <h4 className="font-semibold text-white group-hover:text-slate-300">
              Update Profile
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Organization settings
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

      {/* Profile Completion Nudge */}
      {(!profile?.organizationName || !profile?.description || !profile?.location) && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-xl shadow-amber-900/20">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-300">
                Complete Your Profile
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Your organization profile is incomplete. Add your organization details,
                description, and location to build trust with candidates.
              </p>
              <Link
                href="/organization/setup"
                className="mt-4 inline-flex rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/30"
              >
                Complete profile →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
