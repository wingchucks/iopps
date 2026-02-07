"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getStreakStatus,
  recordDailyActivity,
  getStreakMilestones,
} from "@/lib/firestore";
import type { StreakStatus } from "@/lib/firestore";
import { Flame, Shield, Trophy, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface StreakDisplayProps {
  compact?: boolean;
}

export default function StreakDisplay({ compact = false }: StreakDisplayProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [milestones, setMilestones] = useState<{ milestone: number; achieved: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingActivity, setRecordingActivity] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadStreak = async () => {
      try {
        setLoading(true);
        const [streakStatus, streakMilestones] = await Promise.all([
          getStreakStatus(user.uid),
          getStreakMilestones(user.uid),
        ]);
        setStatus(streakStatus);
        setMilestones(streakMilestones);

        // Automatically record activity on page load
        if (!streakStatus.isActiveToday) {
          const result = await recordDailyActivity(user.uid);
          if (result.streakUpdated) {
            setStatus((prev) => prev ? { ...prev, currentStreak: result.newStreak, isActiveToday: true } : null);
            if (result.milestoneReached) {
              toast.success(`${result.milestoneReached}`, {
                icon: "🔥",
                duration: 5000,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading streak:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStreak();
  }, [user]);

  const handleRecordActivity = async () => {
    if (!user || recordingActivity || status?.isActiveToday) return;

    try {
      setRecordingActivity(true);
      const result = await recordDailyActivity(user.uid);
      if (result.streakUpdated) {
        setStatus((prev) => prev ? { ...prev, currentStreak: result.newStreak, isActiveToday: true, willBreakTomorrow: false } : null);
        toast.success("Activity recorded! Streak updated.", {
          icon: "🔥",
        });
        if (result.milestoneReached) {
          setTimeout(() => {
            toast.success(result.milestoneReached!, {
              icon: "🏆",
              duration: 5000,
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error recording activity:", error);
      toast.error("Failed to record activity");
    } finally {
      setRecordingActivity(false);
    }
  };

  if (loading) {
    return (
      <div className={`${compact ? "h-12" : "h-32"} rounded-xl bg-surface animate-pulse`} />
    );
  }

  if (!status) return null;

  // Compact display for header/sidebar
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          status.currentStreak > 0
            ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
            : "bg-surface border border-[var(--card-border)]"
        }`}>
          <Flame className={`h-4 w-4 ${status.currentStreak > 0 ? "text-orange-400" : "text-foreground0"}`} />
          <span className={`font-bold ${status.currentStreak > 0 ? "text-orange-400" : "text-foreground0"}`}>
            {status.currentStreak}
          </span>
          <span className="text-xs text-[var(--text-muted)]">day streak</span>
        </div>
        {status.isActiveToday && (
          <span title="Active today!">
            <CheckCircle className="h-4 w-4 text-accent" />
          </span>
        )}
        {status.willBreakTomorrow && (
          <span title="Streak at risk!">
            <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
          </span>
        )}
      </div>
    );
  }

  // Full display for dashboard
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <h3 className="font-semibold text-white">Activity Streak</h3>
        </div>
        {status.freezesRemaining > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]" title="Streak protection available">
            <Shield className="h-4 w-4 text-cyan-400" />
            {status.freezesRemaining} freeze
          </div>
        )}
      </div>

      {/* Main Streak Display */}
      <div className="flex items-center gap-6 mb-6">
        <div className={`relative p-6 rounded-full ${
          status.currentStreak > 0
            ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30"
            : "bg-surface border-2 border-[var(--card-border)]"
        }`}>
          <Flame className={`h-10 w-10 ${status.currentStreak > 0 ? "text-orange-400" : "text-[var(--text-secondary)]"}`} />
          {status.isActiveToday && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${status.currentStreak > 0 ? "text-orange-400" : "text-foreground0"}`}>
              {status.currentStreak}
            </span>
            <span className="text-[var(--text-muted)]">day streak</span>
          </div>
          <p className="text-sm text-foreground0 mt-1">
            Best: {status.longestStreak} days | Total: {status.totalActiveDays} days active
          </p>
        </div>
      </div>

      {/* Streak Warning */}
      {status.willBreakTomorrow && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Streak at risk!</p>
            <p className="text-xs text-[var(--text-muted)]">Visit again tomorrow to keep your streak alive</p>
          </div>
          {!status.isActiveToday && (
            <button
              onClick={handleRecordActivity}
              disabled={recordingActivity}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {recordingActivity ? "Recording..." : "Check In"}
            </button>
          )}
        </div>
      )}

      {/* Today's Status */}
      {status.isActiveToday ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20 mb-4">
          <CheckCircle className="h-5 w-5 text-accent" />
          <p className="text-sm text-accent">You're active today! Come back tomorrow to continue your streak.</p>
        </div>
      ) : !status.willBreakTomorrow && (
        <button
          onClick={handleRecordActivity}
          disabled={recordingActivity}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 mb-4"
        >
          {recordingActivity ? "Recording activity..." : "Check In for Today"}
        </button>
      )}

      {/* Next Milestone Progress */}
      {status.nextMilestone && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">Next milestone: {status.nextMilestone} days</span>
            <span className="text-foreground0">{status.progressToNextMilestone}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
              style={{ width: `${status.progressToNextMilestone}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestones */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Milestones</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {milestones.map(({ milestone, achieved }) => (
            <div
              key={milestone}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                achieved
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30"
                  : "bg-surface text-foreground0 border border-[var(--card-border)]"
              }`}
            >
              {milestone} days
              {achieved && " ✓"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
