"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getLeaderboard,
  getUserLeaderboardPosition,
} from "@/lib/firestore";
import type { LeaderboardEntry, LeaderboardData, LeaderboardType } from "@/lib/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Medal,
  Award,
  Users,
  MessageSquare,
  Flame,
  TrendingUp,
  Crown,
  ChevronRight,
} from "lucide-react";

interface CommunityLeaderboardProps {
  maxDisplay?: number;
  showFilters?: boolean;
  compact?: boolean;
}

export default function CommunityLeaderboard({
  maxDisplay = 10,
  showFilters = true,
  compact = false,
}: CommunityLeaderboardProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userPosition, setUserPosition] = useState<{ rank: number; percentile: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<LeaderboardType>("overall");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await getLeaderboard(activeType, maxDisplay, user?.uid);
        setLeaderboard(data);

        if (user) {
          const position = await getUserLeaderboardPosition(user.uid);
          setUserPosition({ rank: position.rank, percentile: position.percentile });
        }
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [activeType, maxDisplay, user]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-[var(--text-secondary)]" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-foreground0 font-medium">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-slate-400/20 to-slate-300/20 border-slate-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/30";
      default:
        return "bg-surface border-[var(--card-border)]";
    }
  };

  const leaderboardTypes: { type: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { type: "overall", label: "Overall", icon: <Trophy className="h-4 w-4" /> },
    { type: "connections", label: "Networkers", icon: <Users className="h-4 w-4" /> },
    { type: "contributors", label: "Contributors", icon: <MessageSquare className="h-4 w-4" /> },
    { type: "streak", label: "Streaks", icon: <Flame className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto text-slate-600 mb-3" />
        <p className="text-[var(--text-muted)]">No leaderboard data yet</p>
        <p className="text-sm text-foreground0 mt-1">
          Be one of the first to climb the ranks!
        </p>
      </div>
    );
  }

  if (compact) {
    // Compact display for sidebar/widgets
    return (
      <div className="space-y-3">
        {leaderboard.entries.slice(0, 5).map((entry) => (
          <Link
            key={entry.userId}
            href={`/member/${entry.userId}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <div className="w-6 text-center">{getRankIcon(entry.rank)}</div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={entry.avatarUrl} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                {getInitials(entry.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.displayName}</p>
            </div>
            <span className="text-xs text-foreground0">{entry.score} pts</span>
          </Link>
        ))}
        <Link
          href="/community/leaderboard"
          className="flex items-center justify-center gap-2 text-sm text-accent hover:text-emerald-300 py-2"
        >
          View Full Leaderboard
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {leaderboardTypes.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === type
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:bg-slate-700"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* User's Position (if not in top list) */}
      {user && userPosition && userPosition.rank > maxDisplay && leaderboard.userEntry && (
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-accent">#{userPosition.rank}</span>
              <div>
                <p className="font-medium text-white">Your Position</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Top {100 - userPosition.percentile}% of community
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">{leaderboard.userEntry.score}</p>
              <p className="text-xs text-[var(--text-muted)]">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        {leaderboard.entries.map((entry) => {
          const isCurrentUser = user?.uid === entry.userId;

          return (
            <Link
              key={entry.userId}
              href={`/member/${entry.userId}`}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-lg ${getRankBg(entry.rank)} ${
                isCurrentUser ? "ring-2 ring-emerald-500/50" : ""
              }`}
            >
              {/* Rank */}
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <Avatar className="h-12 w-12 border-2 border-[var(--card-border)]">
                <AvatarImage src={entry.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  {getInitials(entry.displayName)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">
                    {entry.displayName}
                  </p>
                  {isCurrentUser && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent">
                      You
                    </span>
                  )}
                </div>
                {entry.indigenousAffiliation && (
                  <p className="text-xs text-accent truncate mt-0.5">
                    {entry.indigenousAffiliation}
                  </p>
                )}
                {/* Score breakdown */}
                <div className="flex items-center gap-3 mt-1 text-xs text-foreground0">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {Math.round(entry.breakdown.connections / 10)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {Math.round(entry.breakdown.posts / 15)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    {Math.round(entry.breakdown.streak / 5)}d
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="text-lg font-bold text-white">{entry.score}</p>
                <p className="text-xs text-foreground0">points</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-foreground0">
        {leaderboard.totalParticipants} community members ranked
        <span className="mx-2">·</span>
        Updated {leaderboard.lastUpdated.toLocaleDateString()}
      </div>
    </div>
  );
}
