"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  getMemberEngagementStats,
  checkMilestones,
  getMilestoneProgress,
} from "@/lib/firestore";
import type { MemberEngagementStats, EngagementMilestone } from "@/lib/firestore";
import { useAsyncData } from "@/lib/hooks";
import {
  Eye,
  Users,
  FileText,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type TabType = "overview" | "profile" | "applications" | "saved" | "training" | "alerts" | "messages" | "settings";

interface EngagementStatsProps {
  onNavigate?: (tab: TabType) => void;
}

export default function EngagementStats({ onNavigate }: EngagementStatsProps) {
  const { user } = useAuth();

  const { data, loading } = useAsyncData(
    async () => {
      if (!user) return null;
      const engagementStats = await getMemberEngagementStats(user.uid);
      return {
        stats: engagementStats,
        milestones: checkMilestones(engagementStats),
        milestoneProgress: getMilestoneProgress(engagementStats),
      };
    },
    [user?.uid]
  );

  const stats = data?.stats ?? null;
  const milestones = data?.milestones ?? [];
  const milestoneProgress = data?.milestoneProgress ?? { achieved: 0, total: 0, percentage: 0 };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-accent" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-surface p-5 animate-pulse">
              <div className="h-4 w-24 bg-surface rounded mb-3" />
              <div className="h-8 w-16 bg-surface rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Profile Views",
      value: stats.profileViews.total,
      subValue: `${stats.profileViews.thisWeek} this week`,
      icon: Eye,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/20",
      iconColor: "text-blue-400",
      trend: stats.profileViews.trend,
      link: user ? `/member/${user.uid}` : "/member/profile",
    },
    {
      label: "Connections",
      value: stats.connections.total,
      subValue: stats.connections.pending > 0 ? `${stats.connections.pending} pending` : `${stats.connections.thisMonth} this month`,
      icon: Users,
      color: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-accent/20",
      iconColor: "text-accent",
      link: "/members",
    },
    {
      label: "Posts & Engagement",
      value: stats.posts.total,
      subValue: `${stats.posts.totalLikes} likes, ${stats.posts.totalComments} comments`,
      icon: FileText,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
      link: "/network",
    },
    {
      label: "Applications",
      value: stats.applications.total,
      subValue: stats.applications.active > 0 ? `${stats.applications.active} active` : `${stats.applications.thisMonth} this month`,
      icon: Briefcase,
      color: "from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/20",
      iconColor: "text-amber-400",
      onClick: () => onNavigate?.("applications"),
    },
  ];

  // Get next milestone to achieve
  const nextMilestone = milestones.find((m) => !m.achieved);
  const recentlyAchieved = milestones.filter((m) => m.achieved).slice(-3);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div
              className={`rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-5 transition-all hover:shadow-lg group cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-surface ${card.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {card.trend && getTrendIcon(card.trend)}
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-[var(--text-muted)]">{card.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-white">{card.value}</span>
                </div>
                <p className="text-xs text-foreground0 mt-1">{card.subValue}</p>
              </div>
              <ChevronRight className="absolute top-4 right-4 h-4 w-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );

          if (card.link) {
            return (
              <Link key={card.label} href={card.link} className="relative">
                {content}
              </Link>
            );
          }

          return (
            <div key={card.label} onClick={card.onClick} className="relative">
              {content}
            </div>
          );
        })}
      </div>

      {/* Milestones Section */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white">Community Milestones</h3>
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {milestoneProgress.achieved}/{milestoneProgress.total} achieved
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-surface overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${milestoneProgress.percentage}%` }}
          />
        </div>

        {/* Recently Achieved */}
        {recentlyAchieved.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-foreground0 uppercase tracking-wide mb-2">Recently Achieved</p>
            <div className="flex flex-wrap gap-2">
              {recentlyAchieved.map((milestone) => (
                <span
                  key={milestone.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {milestone.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-[var(--card-border)]">
            <div className="p-3 rounded-full bg-surface">
              <Target className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Next: {nextMilestone.label}</p>
              <p className="text-xs text-foreground0">
                {nextMilestone.type === "profile_views" && `Get ${nextMilestone.threshold - stats.profileViews.total} more profile views`}
                {nextMilestone.type === "connections" && `Make ${nextMilestone.threshold - stats.connections.total} more connections`}
                {nextMilestone.type === "posts" && `Create ${nextMilestone.threshold - stats.posts.total} more posts`}
                {nextMilestone.type === "applications" && `Submit ${nextMilestone.threshold - stats.applications.total} more applications`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-white">
                {nextMilestone.type === "profile_views" && Math.min(100, Math.round((stats.profileViews.total / nextMilestone.threshold) * 100))}
                {nextMilestone.type === "connections" && Math.min(100, Math.round((stats.connections.total / nextMilestone.threshold) * 100))}
                {nextMilestone.type === "posts" && Math.min(100, Math.round((stats.posts.total / nextMilestone.threshold) * 100))}
                {nextMilestone.type === "applications" && Math.min(100, Math.round((stats.applications.total / nextMilestone.threshold) * 100))}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-6">
        <h3 className="font-semibold text-white mb-3">Boost Your Engagement</h3>
        <ul className="space-y-2 text-sm text-[var(--text-muted)]">
          {stats.profileViews.total < 10 && (
            <li className="flex items-start gap-2">
              <span className="text-accent">-</span>
              <Link href="/member/profile" className="text-accent hover:underline transition-colors">
                Complete your profile to attract more views
              </Link>
            </li>
          )}
          {stats.connections.total < 5 && (
            <li className="flex items-start gap-2">
              <span className="text-accent">-</span>
              <Link href="/members" className="text-accent hover:underline transition-colors">
                Browse the community directory and connect with others
              </Link>
            </li>
          )}
          {stats.posts.total < 1 && (
            <li className="flex items-start gap-2">
              <span className="text-accent">-</span>
              <Link href="/network" className="text-accent hover:underline transition-colors">
                Share your first post to introduce yourself
              </Link>
            </li>
          )}
          {stats.applications.total < 3 && (
            <li className="flex items-start gap-2">
              <span className="text-accent">-</span>
              <Link href="/careers" className="text-accent hover:underline transition-colors">
                Explore job opportunities and apply
              </Link>
            </li>
          )}
          {stats.profileViews.total >= 10 &&
            stats.connections.total >= 5 &&
            stats.posts.total >= 1 &&
            stats.applications.total >= 3 && (
              <li className="flex items-start gap-2">
                <span className="text-accent">-</span>
                You&apos;re doing great! Keep engaging with the community.
              </li>
            )}
        </ul>
      </div>
    </div>
  );
}
