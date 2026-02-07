"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getRisingStars, getMonthlySpotlight } from "@/lib/firestore";
import type { LeaderboardEntry } from "@/lib/firestore";
import CommunityLeaderboard from "@/components/member/CommunityLeaderboard";
import { FeedLayout } from "@/components/opportunity-graph";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Star,
  TrendingUp,
  ArrowLeft,
  Crown,
  Sparkles,
} from "lucide-react";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [spotlight, setSpotlight] = useState<LeaderboardEntry[]>([]);
  const [risingStars, setRisingStars] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [spotlightData, risingData] = await Promise.all([
          getMonthlySpotlight(),
          getRisingStars(3),
        ]);
        setSpotlight(spotlightData);
        setRisingStars(risingData);
      } catch (error) {
        console.error("Error loading leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <FeedLayout activeNav="community" fullWidth>
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm text-foreground0 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Trophy className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Community Leaderboard</h1>
              <p className="text-foreground0 text-sm">
                Recognize and celebrate our most engaged community members
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <CommunityLeaderboard maxDisplay={25} showFilters />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Spotlight */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h2 className="font-semibold text-slate-900">Top Performers</h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : spotlight.length > 0 ? (
                <div className="space-y-3">
                  {spotlight.map((entry, index) => (
                    <Link
                      key={entry.userId}
                      href={`/member/${entry.userId}`}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-100 ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
                          : "border border-slate-200"
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={entry.avatarUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                            {getInitials(entry.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 p-1 rounded-full bg-yellow-500">
                            <Crown className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {entry.displayName}
                        </p>
                        {entry.indigenousAffiliation && (
                          <p className="text-xs text-accent truncate">
                            {entry.indigenousAffiliation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{entry.score}</p>
                        <p className="text-xs text-foreground0">pts</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground0 text-center py-4">
                  No spotlight data yet
                </p>
              )}
            </div>

            {/* Rising Stars */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h2 className="font-semibold text-slate-900">Rising Stars</h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : risingStars.length > 0 ? (
                <div className="space-y-3">
                  {risingStars.map((entry) => (
                    <Link
                      key={entry.userId}
                      href={`/member/${entry.userId}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                          {getInitials(entry.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">
                          {entry.displayName}
                        </p>
                        <p className="text-xs text-foreground0">
                          {Math.round(entry.breakdown.streak / 5)} day streak
                        </p>
                      </div>
                      <Sparkles className="h-4 w-4 text-accent" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground0 text-center py-4">
                  No rising stars yet
                </p>
              )}
            </div>

            {/* How Points Work */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-purple-400" />
                <h2 className="font-semibold text-slate-900">How Points Work</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-foreground0">
                  <span>Per connection</span>
                  <span className="text-slate-900">+10 pts</span>
                </div>
                <div className="flex justify-between text-foreground0">
                  <span>Per post</span>
                  <span className="text-slate-900">+15 pts</span>
                </div>
                <div className="flex justify-between text-foreground0">
                  <span>Per streak day</span>
                  <span className="text-slate-900">+5 pts</span>
                </div>
                <div className="flex justify-between text-foreground0">
                  <span>Badge points</span>
                  <span className="text-slate-900">Varies</span>
                </div>
                <div className="flex justify-between text-foreground0">
                  <span>Per profile view</span>
                  <span className="text-slate-900">+0.5 pts</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-foreground0">
                Engage with the community to climb the leaderboard!
              </p>
            </div>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
