"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { MemberProfile } from "@/lib/types";
import {
  getMemberEngagementStats,
  listMemberApplications,
  listJobPostings,
  getJobPosting,
} from "@/lib/firestore";
import type { MemberEngagementStats } from "@/lib/firestore";
import {
  Briefcase,
  Bookmark,
  Users,
  Eye,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface ProfileOverviewProps {
  userId: string;
  profile: MemberProfile;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  "in review": "bg-amber-100 text-amber-700",
  reviewed: "bg-amber-100 text-amber-700",
  shortlisted: "bg-amber-100 text-amber-700",
  interviewing: "bg-amber-100 text-amber-700",
  hired: "bg-green-100 text-green-700",
  offered: "bg-green-100 text-green-700",
  "not selected": "bg-slate-100 text-slate-600",
  rejected: "bg-slate-100 text-slate-600",
  withdrawn: "bg-orange-100 text-orange-700",
};

export default function ProfileOverview({ userId, profile }: ProfileOverviewProps) {
  const [stats, setStats] = useState<MemberEngagementStats | null>(null);
  const [recentApps, setRecentApps] = useState<
    { id: string; jobTitle: string; status: string; createdAt: Date | null }[]
  >([]);
  const [recommendedJobs, setRecommendedJobs] = useState<
    { id: string; title: string; employerName: string; location: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName = profile.displayName?.split(" ")[0] || "there";

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [engagementStats, applications, jobs] = await Promise.all([
          getMemberEngagementStats(userId),
          listMemberApplications(userId),
          listJobPostings({ activeOnly: true }),
        ]);

        if (cancelled) return;

        setStats(engagementStats);

        // Map recent applications (top 3) — enrich with job titles
        const top3Apps = applications.slice(0, 3);
        const enriched = await Promise.all(
          top3Apps.map(async (app) => {
            let jobTitle = "Untitled Position";
            try {
              const job = await getJobPosting(app.jobId);
              if (job?.title) jobTitle = job.title;
            } catch { /* ignore */ }
            return {
              id: app.id,
              jobTitle,
              status: app.status,
              createdAt: app.createdAt?.toDate?.() ?? null,
            };
          })
        );
        setRecentApps(enriched);

        // Recommended opportunities (top 3)
        setRecommendedJobs(
          jobs.slice(0, 3).map((job) => ({
            id: job.id,
            title: job.title,
            employerName: job.employerName || "",
            location: job.location,
          }))
        );
      } catch (err) {
        console.error("Error loading overview data:", err);
        if (!cancelled) setError("Failed to load overview data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
      </div>
    );
  }

  // Upcoming events from profile.eventRsvps
  const now = new Date();
  const upcomingEvents = (profile.eventRsvps || []).filter((rsvp) => {
    if (rsvp.status === "not_going") return false;
    const rsvpDate = rsvp.rsvpDate?.toDate?.();
    return rsvpDate && rsvpDate > now;
  });

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Welcome back, {firstName}!
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Here&apos;s a quick look at your activity and opportunities.
        </p>
      </div>

      {/* Quick stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Applications"
            value={stats.applications.total}
          />
          <StatCard
            icon={<Bookmark className="h-5 w-5" />}
            label="Saved Items"
            value={0}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Connections"
            value={stats.connections.total}
          />
          <StatCard
            icon={<Eye className="h-5 w-5" />}
            label="Profile Views"
            value={stats.profileViews.total}
          />
        </div>
      )}

      {/* Recent Applications */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Recent Applications
          </h3>
          <Link
            href={`/member/${userId}?tab=applications`}
            className="text-xs text-accent hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {recentApps.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No applications yet. Start exploring opportunities!
              </p>
            </div>
          ) : (
            recentApps.map((app) => (
              <div
                key={app.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {app.jobTitle}
                  </p>
                  {app.createdAt && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {app.createdAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommended Opportunities */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Recommended Opportunities
          </h3>
          <Link href="/careers" className="text-xs text-accent hover:underline">
            Browse all
          </Link>
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {recommendedJobs.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No opportunities available right now.
              </p>
            </div>
          ) : (
            recommendedJobs.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.id}`}
                className="block px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {job.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {job.employerName && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {job.employerName}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0 ml-2" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Upcoming Events
          </h3>
        </div>
        <div className="px-4 py-6 text-center">
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 3).map((rsvp, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                  <span>
                    {rsvp.eventType} event &mdash;{" "}
                    {rsvp.rsvpDate?.toDate?.()?.toLocaleDateString() || "Date TBD"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Calendar className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                No upcoming events
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
      <div className="flex justify-center text-accent mb-2">{icon}</div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
    </div>
  );
}
