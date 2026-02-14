// Activity Streak Tracking System
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  checkFirebase,
} from "./shared";

// Collection for user streaks
const userStreaksCollection = "user_streaks";

// ============================================
// STREAK TYPES
// ============================================

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD format
  totalActiveDays: number;
  freezesRemaining: number;
  freezeLastUsed?: string; // YYYY-MM-DD format
  streakStartDate?: string;
  milestones: {
    "7_days": boolean;
    "14_days": boolean;
    "30_days": boolean;
    "60_days": boolean;
    "90_days": boolean;
    "180_days": boolean;
    "365_days": boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  willBreakTomorrow: boolean;
  freezesRemaining: number;
  nextMilestone: number | null;
  progressToNextMilestone: number;
  totalActiveDays: number;
}

// ============================================
// STREAK FUNCTIONS
// ============================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get or create user streak record
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const ref = doc(firestore, userStreaksCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Create initial streak record
      const initialStreak: Omit<UserStreak, "createdAt" | "updatedAt"> = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
        totalActiveDays: 0,
        freezesRemaining: 1,
        milestones: {
          "7_days": false,
          "14_days": false,
          "30_days": false,
          "60_days": false,
          "90_days": false,
          "180_days": false,
          "365_days": false,
        },
      };

      await setDoc(ref, {
        ...initialStreak,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...initialStreak,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    }

    return snap.data() as UserStreak;
  } catch (error) {
    console.error("Error getting user streak:", error);
    return null;
  }
}

/**
 * Record user activity for today and update streak
 */
export async function recordDailyActivity(userId: string): Promise<{
  streakUpdated: boolean;
  newStreak: number;
  milestoneReached?: string;
}> {
  const firestore = checkFirebase();
  if (!firestore) return { streakUpdated: false, newStreak: 0 };

  try {
    const ref = doc(firestore, userStreaksCollection, userId);
    const streak = await getUserStreak(userId);
    if (!streak) return { streakUpdated: false, newStreak: 0 };

    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // Already recorded today
    if (streak.lastActiveDate === today) {
      return { streakUpdated: false, newStreak: streak.currentStreak };
    }

    let newCurrentStreak = streak.currentStreak;
    let newLongestStreak = streak.longestStreak;
    let milestoneReached: string | undefined;

    if (streak.lastActiveDate === yesterday) {
      // Consecutive day - increment streak
      newCurrentStreak++;
    } else if (streak.lastActiveDate === "") {
      // First activity ever
      newCurrentStreak = 1;
    } else {
      // Streak broken - check if we can use a freeze
      const daysMissed = daysBetween(streak.lastActiveDate, today);

      if (daysMissed === 2 && streak.freezesRemaining > 0) {
        // Can use a freeze (missed exactly one day)
        newCurrentStreak++; // Continue streak
        await updateDoc(ref, {
          freezesRemaining: streak.freezesRemaining - 1,
          freezeLastUsed: yesterday,
        });
      } else {
        // Streak is broken
        newCurrentStreak = 1;
      }
    }

    // Update longest streak
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    // Check milestones
    const milestoneThresholds = [7, 14, 30, 60, 90, 180, 365];
    const milestoneKeys = ["7_days", "14_days", "30_days", "60_days", "90_days", "180_days", "365_days"] as const;

    const updatedMilestones = { ...streak.milestones };

    for (let i = 0; i < milestoneThresholds.length; i++) {
      if (newCurrentStreak >= milestoneThresholds[i] && !streak.milestones[milestoneKeys[i]]) {
        updatedMilestones[milestoneKeys[i]] = true;
        milestoneReached = `${milestoneThresholds[i]} Day Streak!`;
      }
    }

    // Update streak record
    await updateDoc(ref, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActiveDate: today,
      totalActiveDays: streak.totalActiveDays + 1,
      streakStartDate: newCurrentStreak === 1 ? today : streak.streakStartDate,
      milestones: updatedMilestones,
      updatedAt: serverTimestamp(),
    });

    // Reset freeze each week (on Sunday)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 && streak.freezesRemaining < 1) {
      await updateDoc(ref, { freezesRemaining: 1 });
    }

    return {
      streakUpdated: true,
      newStreak: newCurrentStreak,
      milestoneReached,
    };
  } catch (error) {
    console.error("Error recording daily activity:", error);
    return { streakUpdated: false, newStreak: 0 };
  }
}

/**
 * Get streak status for display
 */
export async function getStreakStatus(userId: string): Promise<StreakStatus> {
  const streak = await getUserStreak(userId);

  const defaultStatus: StreakStatus = {
    currentStreak: 0,
    longestStreak: 0,
    isActiveToday: false,
    willBreakTomorrow: false,
    freezesRemaining: 1,
    nextMilestone: 7,
    progressToNextMilestone: 0,
    totalActiveDays: 0,
  };

  if (!streak) return defaultStatus;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  const isActiveToday = streak.lastActiveDate === today;
  const willBreakTomorrow = !isActiveToday && streak.lastActiveDate !== yesterday && streak.currentStreak > 0;

  // Calculate next milestone
  const milestoneThresholds = [7, 14, 30, 60, 90, 180, 365];
  let nextMilestone: number | null = null;
  let progressToNextMilestone = 0;

  for (const threshold of milestoneThresholds) {
    if (streak.currentStreak < threshold) {
      nextMilestone = threshold;
      progressToNextMilestone = Math.round((streak.currentStreak / threshold) * 100);
      break;
    }
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    isActiveToday,
    willBreakTomorrow,
    freezesRemaining: streak.freezesRemaining,
    nextMilestone,
    progressToNextMilestone,
    totalActiveDays: streak.totalActiveDays,
  };
}

/**
 * Check if streak will break (for notifications)
 */
export async function checkStreakAtRisk(userId: string): Promise<boolean> {
  const streak = await getUserStreak(userId);
  if (!streak) return false;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  // Streak is at risk if user was active yesterday but not today
  return streak.lastActiveDate === yesterday && streak.currentStreak > 0;
}

/**
 * Get streak milestones achieved
 */
export async function getStreakMilestones(userId: string): Promise<{ milestone: number; achieved: boolean }[]> {
  const streak = await getUserStreak(userId);
  if (!streak) return [];

  const milestoneThresholds = [7, 14, 30, 60, 90, 180, 365];
  const milestoneKeys = ["7_days", "14_days", "30_days", "60_days", "90_days", "180_days", "365_days"] as const;

  return milestoneThresholds.map((threshold, i) => ({
    milestone: threshold,
    achieved: streak.milestones[milestoneKeys[i]],
  }));
}
