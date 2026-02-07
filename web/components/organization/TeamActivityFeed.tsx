"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getRecentActivities,
  formatActivityMessage,
  getActivityStyle,
} from "@/lib/firestore/teamActivity";
import type { TeamActivityLog, TeamActivityAction } from "@/lib/types";
import {
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";

interface TeamActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

/**
 * Displays a feed of recent team activities for the organization.
 */
export function TeamActivityFeed({ limit = 10, showHeader = true }: TeamActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<TeamActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      if (!user) return;

      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const recentActivities = await getRecentActivities(profile.id, limit);
          setActivities(recentActivities);
        }
      } catch (err) {
        console.error("Failed to load team activities:", err);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [user, limit]);

  const getActionIcon = (action: TeamActivityAction) => {
    const iconClass = "h-4 w-4";
    switch (action) {
      case "created":
        return <PlusIcon className={iconClass} />;
      case "updated":
        return <PencilIcon className={iconClass} />;
      case "deleted":
        return <TrashIcon className={iconClass} />;
      case "published":
        return <EyeIcon className={iconClass} />;
      case "unpublished":
        return <EyeSlashIcon className={iconClass} />;
      case "duplicated":
        return <DocumentDuplicateIcon className={iconClass} />;
      case "archived":
        return <ArchiveBoxIcon className={iconClass} />;
      default:
        return <ClockIcon className={iconClass} />;
    }
  };

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return "";

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="mx-auto h-10 w-10 text-[var(--text-secondary)]" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">No recent activity</p>
        <p className="text-xs text-foreground0">Team activities will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <span className="text-xs text-foreground0">{activities.length} items</span>
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => {
          const style = getActivityStyle(activity.action);
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface transition-colors"
            >
              <div className={`p-2 rounded-lg ${style.bgColor}`}>
                <span className={style.color}>{getActionIcon(activity.action)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.userName}</span>{" "}
                  <span className="text-[var(--text-muted)]">{formatActivityMessage(activity)}</span>
                </p>
                <p className="text-xs text-foreground0 mt-0.5">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TeamActivityFeed;
