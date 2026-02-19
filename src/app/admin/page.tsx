"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDateTime } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminCounts {
  users: number;
  jobs: { total: number; active: number };
  employers: { total: number; pending: number };
  conferences: number;
  scholarships: number;
  applications: number;
  vendors?: number;
  contentFlags?: number;
  pendingVerifications?: number;
  verificationRequests?: { pending: number };
}

interface AuditLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

// ---------------------------------------------------------------------------
// timeAgo helper
// ---------------------------------------------------------------------------

/**
 * Convert a date value (ISO string, Firebase timestamp object, or Date)
 * to a human-readable relative time string.
 */
function timeAgo(value: unknown): string {
  if (!value) return "";

  let date: Date;

  // Handle Firebase Timestamp objects ({ seconds, _seconds })
  if (typeof value === "object" && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === "number") {
      date = new Date(v.seconds * 1000);
    } else if (typeof v._seconds === "number") {
      date = new Date(v._seconds * 1000);
    } else {
      date = new Date(value as unknown as string | number);
    }
  } else {
    date = new Date(value as unknown as string | number);
  }

  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  return formatDateTime(value);
}

// ---------------------------------------------------------------------------
// Activity dot color helper
// ---------------------------------------------------------------------------

function activityDotColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("user") || t.includes("signup")) return "bg-blue-500";
  if (t.includes("job")) return "bg-green-500";
  if (t.includes("report") || t.includes("flag")) return "bg-red-500";
  if (t.includes("payment") || t.includes("subscription")) return "bg-amber-500";
  return "bg-gray-400";
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value, badge, badgeColor, delay = 0 }: StatCardProps) {
  return (
    <div
      className="animate-fade-up bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 transition-all duration-200 hover:border-[var(--card-border-hover)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {icon}
        </div>
        {badge && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor || "bg-warning/10 text-warning"}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function UsersIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
}
function BriefcaseIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>;
}
function BuildingIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="6" x2="8" y2="6" /><line x1="12" y1="6" x2="12" y2="6" /><line x1="16" y1="6" x2="16" y2="6" /></svg>;
}
function ShopIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function ShieldIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function CheckCircleIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}
function CalendarIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function AwardIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>;
}
function FileTextIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function SettingsIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
function RssIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 019 9" /><path d="M4 4a16 16 0 0116 16" /><circle cx="5" cy="19" r="1" /></svg>;
}
function ChevronRightIcon({ className }: { className?: string }) {
  return <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
function AlertIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}
function VideoIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [liveStreams, setLiveStreams] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const token = await user!.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [countsRes, activityRes] = await Promise.all([
          fetch("/api/admin/counts", { headers }),
          fetch("/api/admin/activity", { headers }).catch(() => null),
        ]);

        if (!countsRes.ok) throw new Error("Failed to fetch counts");
        const countsData = await countsRes.json();
        if (!cancelled) setCounts(countsData.counts ?? countsData);

        if (activityRes?.ok) {
          const activityData = await activityRes.json();
          if (!cancelled) setActivity(activityData.logs ?? []);
        }

        // Fetch live stream count (separate call, non-blocking)
        try {
          const liveRes = await fetch("/api/admin/livestreams?status=live", { headers });
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (!cancelled) {
              // Support both array response and count response
              const count = Array.isArray(liveData.livestreams)
                ? liveData.livestreams.length
                : (liveData.count ?? 0);
              setLiveStreams(count);
            }
          }
        } catch {
          // livestreams endpoint may not exist yet -- ignore
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching admin data:", err);
          setError("Unable to load platform statistics.");
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  const pendingEmployers = counts?.employers?.pending ?? 0;
  const openReports = counts?.contentFlags ?? 0;
  const pendingVerifications =
    counts?.pendingVerifications ??
    (counts?.verificationRequests as { pending: number } | undefined)?.pending ??
    0;
  const needsAttention = pendingEmployers > 0 || openReports > 0;

  const stats: StatCardProps[] = [
    { icon: <UsersIcon />, label: "Total Users", value: counts?.users ?? "—", delay: 0 },
    { icon: <BriefcaseIcon />, label: "Active Jobs", value: counts?.jobs?.active ?? "—", badge: counts?.jobs ? `${counts.jobs.total} total` : undefined, delay: 80 },
    { icon: <BuildingIcon />, label: "Employers", value: counts?.employers?.total ?? "—", badge: pendingEmployers ? `${pendingEmployers} pending` : undefined, badgeColor: "bg-warning/10 text-warning", delay: 160 },
    { icon: <ShopIcon />, label: "Shop Listings", value: counts?.vendors ?? "—", delay: 240 },
    { icon: <ShieldIcon />, label: "Open Reports", value: openReports || "—", badge: openReports ? "Action needed" : undefined, badgeColor: "bg-red-500/10 text-red-400", delay: 320 },
    { icon: <CheckCircleIcon />, label: "Pending Verifications", value: pendingVerifications || "—", delay: 400 },
    { icon: <CalendarIcon />, label: "Conferences", value: counts?.conferences ?? "—", delay: 480 },
    { icon: <AwardIcon />, label: "Scholarships", value: counts?.scholarships ?? "—", delay: 560 },
    { icon: <FileTextIcon />, label: "Applications", value: counts?.applications ?? "—", delay: 640 },
  ];

  const quickActions = [
    { label: "Manage Employers", href: "/admin/employers", icon: <BuildingIcon /> },
    { label: "Review Reports", href: "/admin/moderation", icon: <ShieldIcon /> },
    { label: "Feed Sync", href: "/admin/feed-sync", icon: <RssIcon /> },
    { label: "Jobs", href: "/admin/jobs", icon: <BriefcaseIcon /> },
    { label: "Users", href: "/admin/users", icon: <UsersIcon /> },
    { label: "Settings", href: "/admin/settings", icon: <SettingsIcon /> },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-[var(--text-secondary)]">Platform overview and moderation tools</p>
      </div>

      {/* Platform Status Bar */}
      <div className="animate-fade-up flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3">
        {/* Online status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-400">Platform Online</span>
        </div>

        <span className="hidden sm:inline text-[var(--card-border)]">|</span>

        {/* Live streams */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <VideoIcon />
          <span>
            <span className="font-medium text-foreground">{liveStreams}</span> LIVE stream{liveStreams !== 1 ? "s" : ""}
          </span>
        </div>

        <span className="hidden sm:inline text-[var(--card-border)]">|</span>

        {/* Pending verifications */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <CheckCircleIcon />
          <span>
            <span className="font-medium text-foreground">{pendingVerifications}</span> Pending verification{pendingVerifications !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {/* Urgent Attention Banner */}
      {needsAttention && (
        <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <div className="text-amber-400"><AlertIcon /></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Needs your attention</p>
            <p className="text-sm text-amber-400/80">
              {pendingEmployers > 0 && `${pendingEmployers} employer${pendingEmployers > 1 ? "s" : ""} pending approval`}
              {pendingEmployers > 0 && openReports > 0 && " · "}
              {openReports > 0 && `${openReports} open content report${openReports > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            {pendingEmployers > 0 && (
              <Link href="/admin/employers?status=pending" className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">
                Review Employers
              </Link>
            )}
            {openReports > 0 && (
              <Link href="/admin/moderation" className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">
                Review Reports
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-accent hover:bg-accent/5"
            >
              <div className="flex items-center gap-3">
                <div className="text-[var(--text-muted)] group-hover:text-accent transition-colors">{action.icon}</div>
                {action.label}
              </div>
              <ChevronRightIcon className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "300ms" }}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-1">
            {activity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--card-border)]/30"
              >
                {/* Color-coded dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${activityDotColor(log.type)}`} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{log.message}</p>
                  {log.createdAt && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {timeAgo(log.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
