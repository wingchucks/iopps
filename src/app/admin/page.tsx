"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AdminActionBar,
  AdminPageHeader,
  AdminStatGrid,
} from "@/components/admin";
import { formatDateTime } from "@/lib/format-date";
import type { AdminCounts } from "@/lib/admin/view-types";

interface AuditLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

function timeAgo(value: unknown): string {
  if (!value) return "";

  let date: Date;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.seconds === "number") {
      date = new Date(record.seconds * 1000);
    } else if (typeof record._seconds === "number") {
      date = new Date(record._seconds * 1000);
    } else {
      return "";
    }
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    return "";
  }

  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
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

function activityDotColor(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes("user") || normalized.includes("signup")) return "bg-info";
  if (normalized.includes("job")) return "bg-success";
  if (normalized.includes("report") || normalized.includes("flag")) return "bg-error";
  if (normalized.includes("payment") || normalized.includes("subscription")) return "bg-warning";
  return "bg-[var(--text-muted)]";
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [liveStreams, setLiveStreams] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const token = await currentUser!.getIdToken();
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

        try {
          const liveRes = await fetch("/api/admin/livestreams?status=live", { headers });
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (!cancelled) {
              const count = Array.isArray(liveData.livestreams)
                ? liveData.livestreams.length
                : (liveData.count ?? 0);
              setLiveStreams(count);
            }
          }
        } catch {
          // optional endpoint
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching admin data:", err);
          setError("Unable to load admin dashboard data.");
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const pendingEmployers = counts?.employers?.pending ?? 0;
  const openReports = counts?.contentFlags ?? 0;
  const pendingVerifications =
    counts?.pendingVerifications ??
    counts?.verificationRequests?.pending ??
    0;
  const unreadNotifications = counts?.unreadNotifications ?? 0;

  const queueStats = useMemo(
    () => [
      {
        label: "Pending businesses & schools",
        value: pendingEmployers,
        helper: "Accounts waiting for approval in the review queue",
        tone: "warning" as const,
        href: "/admin/employers?status=pending",
        icon: <BuildingIcon />,
      },
      {
        label: "Open moderation reports",
        value: openReports,
        helper: "Reported content that still needs a decision",
        tone: "danger" as const,
        href: "/admin/moderation",
        icon: <ShieldIcon />,
      },
      {
        label: "Pending verifications",
        value: pendingVerifications,
        helper: "Identity or org verification requests still queued",
        tone: "info" as const,
        href: "/admin/verification",
        icon: <ShieldIcon />,
      },
      {
        label: "Unread admin notifications",
        value: unreadNotifications,
        helper: "Alerts and reminders that have not been cleared",
        href: "/admin/settings",
        icon: <BellIcon />,
      },
    ],
    [openReports, pendingEmployers, pendingVerifications, unreadNotifications],
  );

  const platformStats = useMemo(
    () => [
      {
        label: "Total users",
        value: counts?.users ?? "—",
        helper: "Registered user accounts across the platform",
        icon: <UsersIcon />,
      },
      {
        label: "Active jobs",
        value: counts?.jobs?.active ?? "—",
        helper: counts?.jobs ? `${counts.jobs.total} total job records` : "Published opportunities",
        tone: "success" as const,
        icon: <BriefcaseIcon />,
      },
      {
        label: "Conferences",
        value: counts?.conferences ?? "—",
        helper: "Tracked conference listings",
        icon: <CalendarIcon />,
      },
      {
        label: "Applications",
        value: counts?.applications ?? "—",
        helper: "Applications currently stored in the platform",
        icon: <FileTextIcon />,
      },
    ],
    [counts],
  );

  const quickActions = [
    {
      label: "Review businesses & schools",
      href: "/admin/employers?status=pending",
      helper: "Start with the highest-priority approval queue.",
      icon: <BuildingIcon />,
      tone: "warning" as const,
    },
    {
      label: "Open moderation queue",
      href: "/admin/moderation",
      helper: "Work down pending reports and flagged content.",
      icon: <ShieldIcon />,
      tone: openReports > 0 ? ("danger" as const) : ("default" as const),
    },
    {
      label: "Manage users",
      href: "/admin/users",
      helper: "Update roles and check account details.",
      icon: <UsersIcon />,
    },
    {
      label: "Payments & revenue",
      href: "/admin/payments",
      helper: "Inspect subscription and one-time payment activity.",
      icon: <FileTextIcon />,
    },
    {
      label: "Feed sync",
      href: "/admin/feed-sync",
      helper: "Run and inspect content feed imports.",
      icon: <VideoIcon />,
    },
    {
      label: "Verification queue",
      href: "/admin/verification",
      helper: "Review pending verification requests.",
      icon: <ShieldIcon />,
      tone: pendingVerifications > 0 ? ("warning" as const) : ("default" as const),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        description="Start with the queues that need action today, then drop into platform volume and recent operational activity."
        meta={
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              Platform online
            </span>
            <span className="inline-flex items-center gap-2">
              <VideoIcon />
              {liveStreams} live stream{liveStreams === 1 ? "" : "s"}
            </span>
            <span>{unreadNotifications} unread admin notification{unreadNotifications === 1 ? "" : "s"}</span>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Priority Queues
          </h2>
        </div>
        <AdminStatGrid items={queueStats} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Platform Snapshot
        </h2>
        <AdminStatGrid items={platformStats} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Quick Actions
        </h2>
        <AdminActionBar items={quickActions} />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              A condensed stream of recent admin-relevant events.
            </p>
          </div>
          <Link href="/admin/reports" className="text-sm font-medium text-accent hover:underline">
            View analytics
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--card-border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No recent admin activity
          </p>
        ) : (
          <div className="space-y-1">
            {activity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--muted)]"
              >
                <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${activityDotColor(log.type)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-foreground">{log.message}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {timeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
