"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  PlusCircleIcon,
  UserPlusIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentPlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export type ActivityType =
  | "employer_approved"
  | "employer_rejected"
  | "vendor_approved"
  | "vendor_rejected"
  | "job_posted"
  | "member_signup"
  | "application_received"
  | "import_completed"
  | "conference_added"
  | "powwow_added"
  | "user_created"
  | "custom";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  href?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

// ============================================================================
// Config
// ============================================================================

const activityConfig: Record<
  ActivityType,
  {
    icon: typeof CheckCircleIcon;
    iconClass: string;
    bgClass: string;
  }
> = {
  employer_approved: {
    icon: CheckCircleIcon,
    iconClass: "text-green-400",
    bgClass: "bg-green-500/10",
  },
  employer_rejected: {
    icon: XCircleIcon,
    iconClass: "text-red-400",
    bgClass: "bg-red-500/10",
  },
  vendor_approved: {
    icon: CheckCircleIcon,
    iconClass: "text-green-400",
    bgClass: "bg-green-500/10",
  },
  vendor_rejected: {
    icon: XCircleIcon,
    iconClass: "text-red-400",
    bgClass: "bg-red-500/10",
  },
  job_posted: {
    icon: BriefcaseIcon,
    iconClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  member_signup: {
    icon: UserPlusIcon,
    iconClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  application_received: {
    icon: DocumentPlusIcon,
    iconClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
  },
  import_completed: {
    icon: ArrowPathIcon,
    iconClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  conference_added: {
    icon: BuildingOfficeIcon,
    iconClass: "text-indigo-400",
    bgClass: "bg-indigo-500/10",
  },
  powwow_added: {
    icon: SparklesIcon,
    iconClass: "text-pink-400",
    bgClass: "bg-pink-500/10",
  },
  user_created: {
    icon: UserGroupIcon,
    iconClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
  },
  custom: {
    icon: PlusCircleIcon,
    iconClass: "text-[var(--text-muted)]",
    bgClass: "bg-slate-500/10",
  },
};

// ============================================================================
// Time Formatting
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-surface" />
          <div className="flex-1">
            <div className="h-4 w-48 rounded bg-surface" />
            <div className="mt-1 h-3 w-16 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Activity Item Component
// ============================================================================

interface ActivityItemRowProps {
  activity: ActivityItem;
}

function ActivityItemRow({ activity }: ActivityItemRowProps) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  const content = (
    <div className="flex items-start gap-3 group">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgClass}`}
      >
        <Icon className={`h-4 w-4 ${config.iconClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground group-hover:text-white truncate">
          {activity.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-foreground0">
            {formatTimeAgo(activity.timestamp)}
          </span>
          {activity.actor && (
            <>
              <span className="text-[var(--text-secondary)]">•</span>
              <span className="text-xs text-foreground0 truncate">
                {activity.actor}
              </span>
            </>
          )}
        </div>
      </div>
      {activity.href && (
        <ArrowRightIcon className="h-4 w-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );

  if (activity.href) {
    return (
      <Link
        href={activity.href}
        className="block rounded-lg p-2 -ml-2 transition-colors hover:bg-surface"
      >
        {content}
      </Link>
    );
  }

  return <div className="p-2 -ml-2">{content}</div>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivityFeed({
  activities,
  loading = false,
  maxItems = 10,
  showViewAll = false,
  viewAllHref,
}: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Recent Activity
        </h3>
        <ActivityFeedSkeleton />
      </div>
    );
  }

  const displayedActivities = activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        {(showViewAll || hasMore) && viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs text-accent hover:text-teal-300"
          >
            View all
          </Link>
        )}
      </div>

      {displayedActivities.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <ArrowPathIcon className="h-6 w-6 text-foreground0" />
          </div>
          <p className="mt-3 text-sm text-foreground0">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayedActivities.map((activity) => (
            <ActivityItemRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Activity List (for sidebars)
// ============================================================================

export interface CompactActivityListProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
}

export function CompactActivityList({
  activities,
  loading = false,
  maxItems = 5,
}: CompactActivityListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(maxItems)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-slate-700" />
            <div className="h-3 flex-1 rounded bg-surface" />
          </div>
        ))}
      </div>
    );
  }

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {displayedActivities.map((activity) => {
        const config = activityConfig[activity.type];

        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 text-xs"
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${config.iconClass.replace(
                "text-",
                "bg-"
              )}`}
            />
            <span className="text-[var(--text-muted)] truncate flex-1">
              {activity.title}
            </span>
            <span className="text-[var(--text-secondary)] flex-shrink-0">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
