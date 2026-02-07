"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getUserBadges,
  getBadgeProgress,
  getTierColor,
  getTierBorderColor,
  BADGE_DEFINITIONS,
  checkAndAwardBadges,
  getMemberEngagementStats,
} from "@/lib/firestore";
import type { UserBadgeWithDefinition, BadgeDefinition } from "@/lib/firestore";
import {
  Award,
  Trophy,
  Lock,
  Star,
  Users,
  Briefcase,
  MessageSquare,
  Eye,
  UserCheck,
  Target,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BadgeDisplayProps {
  userId?: string;
  showProgress?: boolean;
  maxDisplay?: number;
  compact?: boolean;
}

// Map badge icons to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-check": UserCheck,
  "user-cog": UserCheck,
  star: Star,
  "user-plus": Users,
  users: Users,
  network: Users,
  globe: Users,
  send: Briefcase,
  briefcase: Briefcase,
  target: Target,
  "message-square": MessageSquare,
  "message-circle": MessageSquare,
  award: Award,
  eye: Eye,
  "trending-up": Trophy,
  sun: Star,
};

export default function BadgeDisplay({
  userId,
  showProgress = false,
  maxDisplay = 6,
  compact = false,
}: BadgeDisplayProps) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.uid;

  const [badges, setBadges] = useState<UserBadgeWithDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [progress, setProgress] = useState<{ badge: BadgeDefinition; progress: number; earned: boolean }[]>([]);

  useEffect(() => {
    if (!effectiveUserId) return;

    const loadBadges = async () => {
      try {
        setLoading(true);

        // If viewing own profile, check for new badges first
        if (user?.uid === effectiveUserId) {
          const stats = await getMemberEngagementStats(effectiveUserId);
          await checkAndAwardBadges(effectiveUserId, {
            connections: stats.connections.total,
            applications: stats.applications.total,
            posts: stats.posts.total,
            profileViews: stats.profileViews.total,
          });
        }

        const userBadges = await getUserBadges(effectiveUserId);
        setBadges(userBadges);

        if (showProgress) {
          const stats = await getMemberEngagementStats(effectiveUserId);
          const earnedIds = userBadges.map((b) => b.badgeId);
          const progressData = getBadgeProgress(
            {
              connections: stats.connections.total,
              applications: stats.applications.total,
              posts: stats.posts.total,
              profileViews: stats.profileViews.total,
            },
            earnedIds
          );
          setProgress(progressData);
        }
      } catch (error) {
        console.error("Error loading badges:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, [effectiveUserId, showProgress, user?.uid]);

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Award;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-10 rounded-full bg-surface animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (compact) {
    // Compact inline display for profile headers
    if (badges.length === 0) return null;

    return (
      <div className="flex items-center gap-1">
        {badges.slice(0, maxDisplay).map((userBadge) => {
          const Icon = getIcon(userBadge.badge.icon);
          return (
            <button
              key={userBadge.id}
              onClick={() => setSelectedBadge(userBadge.badge)}
              className={`p-1.5 rounded-full bg-gradient-to-br ${getTierColor(userBadge.badge.tier)} transition-transform hover:scale-110`}
              title={userBadge.badge.name}
            >
              <Icon className="h-3.5 w-3.5 text-white" />
            </button>
          );
        })}
        {badges.length > maxDisplay && (
          <span className="text-xs text-foreground0 ml-1">+{badges.length - maxDisplay}</span>
        )}

        {/* Badge Detail Dialog */}
        <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent className="bg-surface border-[var(--card-border)]">
            <DialogHeader>
              <DialogTitle className="text-white">Badge Details</DialogTitle>
            </DialogHeader>
            {selectedBadge && (
              <div className="text-center py-4">
                <div
                  className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${getTierColor(selectedBadge.tier)} flex items-center justify-center mb-4`}
                >
                  {(() => {
                    const Icon = getIcon(selectedBadge.icon);
                    return <Icon className="h-10 w-10 text-white" />;
                  })()}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedBadge.name}</h3>
                <p className="text-[var(--text-muted)] mt-2">{selectedBadge.description}</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize bg-gradient-to-r ${getTierColor(selectedBadge.tier)} text-white`}>
                    {selectedBadge.tier}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
                    +{selectedBadge.points} pts
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full badge display with progress
  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      {badges.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white">Earned Badges ({badges.length})</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {badges.map((userBadge) => {
              const Icon = getIcon(userBadge.badge.icon);
              return (
                <button
                  key={userBadge.id}
                  onClick={() => setSelectedBadge(userBadge.badge)}
                  className="group flex flex-col items-center"
                >
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${getTierColor(userBadge.badge.tier)} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${getTierBorderColor(userBadge.badge.tier)} border-2`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] mt-2 text-center truncate w-full">
                    {userBadge.badge.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Section */}
      {showProgress && progress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Badge Progress</h3>
          </div>
          <div className="space-y-3">
            {progress
              .filter((p) => !p.earned && p.progress > 0)
              .sort((a, b) => b.progress - a.progress)
              .slice(0, 5)
              .map((item) => {
                const Icon = getIcon(item.badge.icon);
                return (
                  <div
                    key={item.badge.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-surface border border-[var(--card-border)]"
                  >
                    <div className="p-2 rounded-full bg-slate-700">
                      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {item.badge.name}
                        </span>
                        <span className="text-xs text-foreground0">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getTierColor(item.badge.tier)} transition-all`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Locked Badges Preview */}
      {showProgress && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-foreground0" />
            <h3 className="font-semibold text-[var(--text-muted)]">Locked Badges</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {progress
              .filter((p) => !p.earned && p.progress === 0)
              .slice(0, 6)
              .map((item) => {
                const Icon = getIcon(item.badge.icon);
                return (
                  <button
                    key={item.badge.id}
                    onClick={() => setSelectedBadge(item.badge)}
                    className="group flex flex-col items-center opacity-50 hover:opacity-75 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center border-2 border-[var(--card-border)]">
                      <Icon className="h-7 w-7 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-xs text-foreground0 mt-2 text-center truncate w-full">
                      {item.badge.name}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {badges.length === 0 && !showProgress && (
        <div className="text-center py-8">
          <Award className="h-12 w-12 mx-auto text-[var(--text-secondary)] mb-3" />
          <p className="text-[var(--text-muted)]">No badges earned yet</p>
          <p className="text-sm text-foreground0 mt-1">
            Complete your profile and engage with the community to earn badges!
          </p>
        </div>
      )}

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="bg-surface border-[var(--card-border)]">
          <DialogHeader>
            <DialogTitle className="text-white">Badge Details</DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <div className="text-center py-4">
              <div
                className={`mx-auto w-24 h-24 rounded-full bg-gradient-to-br ${getTierColor(selectedBadge.tier)} flex items-center justify-center mb-4 shadow-xl`}
              >
                {(() => {
                  const Icon = getIcon(selectedBadge.icon);
                  return <Icon className="h-12 w-12 text-white" />;
                })()}
              </div>
              <h3 className="text-xl font-bold text-white">{selectedBadge.name}</h3>
              <p className="text-[var(--text-muted)] mt-2">{selectedBadge.description}</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize bg-gradient-to-r ${getTierColor(selectedBadge.tier)} text-white`}>
                  {selectedBadge.tier}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/20">
                  +{selectedBadge.points} points
                </span>
              </div>
              <p className="text-xs text-foreground0 mt-4">
                Requirement: {selectedBadge.requirement.threshold}{" "}
                {selectedBadge.requirement.type.replace("_", " ")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
