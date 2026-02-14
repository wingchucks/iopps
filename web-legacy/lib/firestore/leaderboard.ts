// Community Leaderboard System
import {
  collection,
  getDocs,
  query,
  limit,
  checkFirebase,
  memberCollection,
} from "./shared";
import { getUserBadgePoints } from "./badges";
import { getMemberEngagementStats } from "./memberEngagement";
import { getStreakStatus } from "./streaks";

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  indigenousAffiliation?: string;
  rank: number;
  score: number;
  breakdown: {
    connections: number;
    posts: number;
    badges: number;
    streak: number;
    profileViews: number;
  };
  isOptedIn: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: Date;
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

export type LeaderboardType = "overall" | "connections" | "contributors" | "streak";

// ============================================
// LEADERBOARD CACHE
// ============================================

interface CachedLeaderboard {
  data: LeaderboardData;
  type: LeaderboardType;
  maxEntries: number;
  currentUserId?: string;
  timestamp: number;
}

let leaderboardCache: CachedLeaderboard | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedLeaderboard(
  type: LeaderboardType,
  maxEntries: number,
  currentUserId?: string
): LeaderboardData | null {
  if (
    leaderboardCache &&
    Date.now() - leaderboardCache.timestamp < CACHE_TTL &&
    leaderboardCache.type === type &&
    leaderboardCache.maxEntries === maxEntries &&
    leaderboardCache.currentUserId === currentUserId
  ) {
    return leaderboardCache.data;
  }
  return null;
}

function setCachedLeaderboard(
  data: LeaderboardData,
  type: LeaderboardType,
  maxEntries: number,
  currentUserId?: string
): void {
  leaderboardCache = { data, type, maxEntries, currentUserId, timestamp: Date.now() };
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  connections: 10,      // Points per connection
  posts: 15,            // Points per post
  badges: 1,            // Badge points are already weighted
  streak: 5,            // Points per day of current streak
  profileViews: 0.5,    // Points per profile view
  applications: 2,      // Points per application submitted
};

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

/**
 * Calculate engagement score for a user
 */
export async function calculateEngagementScore(userId: string): Promise<{
  total: number;
  breakdown: LeaderboardEntry["breakdown"];
}> {
  try {
    const [stats, badgePoints, streakStatus] = await Promise.all([
      getMemberEngagementStats(userId),
      getUserBadgePoints(userId),
      getStreakStatus(userId),
    ]);

    const breakdown = {
      connections: stats.connections.total * SCORING_WEIGHTS.connections,
      posts: stats.posts.total * SCORING_WEIGHTS.posts,
      badges: badgePoints,
      streak: streakStatus.currentStreak * SCORING_WEIGHTS.streak,
      profileViews: Math.round(stats.profileViews.total * SCORING_WEIGHTS.profileViews),
    };

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return { total, breakdown };
  } catch (error) {
    console.error("Error calculating engagement score:", error);
    return {
      total: 0,
      breakdown: { connections: 0, posts: 0, badges: 0, streak: 0, profileViews: 0 },
    };
  }
}

/**
 * Get community leaderboard
 */
export async function getLeaderboard(
  type: LeaderboardType = "overall",
  maxEntries: number = 25,
  currentUserId?: string
): Promise<LeaderboardData> {
  // Check cache first to avoid expensive per-member score calculations
  const cached = getCachedLeaderboard(type, maxEntries, currentUserId);
  if (cached) return cached;

  const firestore = checkFirebase();
  if (!firestore) {
    return {
      entries: [],
      totalParticipants: 0,
      lastUpdated: new Date(),
    };
  }

  try {
    // Get all members with profiles
    const membersQuery = query(
      collection(firestore, memberCollection),
      limit(100) // Limit to prevent performance issues
    );

    const snap = await getDocs(membersQuery);

    interface MemberData {
      id: string;
      displayName?: string;
      avatarUrl?: string;
      photoURL?: string;
      indigenousAffiliation?: string;
    }

    const members: MemberData[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MemberData));

    // Calculate scores for each member in parallel
    const entriesPromises = members
      .filter((m) => m.displayName && m.displayName.trim().length > 0)
      .map(async (member) => {
        const { total, breakdown } = await calculateEngagementScore(member.id);

        return {
          userId: member.id,
          displayName: member.displayName || "Member",
          avatarUrl: member.avatarUrl || member.photoURL,
          indigenousAffiliation: member.indigenousAffiliation,
          rank: 0, // Will be set after sorting
          score: total,
          breakdown,
          isOptedIn: true, // TODO: Add opt-in/out preference
        } as LeaderboardEntry;
      });

    let entries = await Promise.all(entriesPromises);

    // Sort based on leaderboard type
    switch (type) {
      case "connections":
        entries.sort((a, b) => b.breakdown.connections - a.breakdown.connections);
        break;
      case "contributors":
        entries.sort((a, b) => b.breakdown.posts - a.breakdown.posts);
        break;
      case "streak":
        entries.sort((a, b) => b.breakdown.streak - a.breakdown.streak);
        break;
      default:
        entries.sort((a, b) => b.score - a.score);
    }

    // Assign ranks
    entries = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Find current user's entry
    let userRank: number | undefined;
    let userEntry: LeaderboardEntry | undefined;

    if (currentUserId) {
      const userIndex = entries.findIndex((e) => e.userId === currentUserId);
      if (userIndex >= 0) {
        userRank = userIndex + 1;
        userEntry = entries[userIndex];
      }
    }

    // Return top entries
    const topEntries = entries.slice(0, maxEntries);

    const result: LeaderboardData = {
      entries: topEntries,
      totalParticipants: entries.length,
      lastUpdated: new Date(),
      userRank,
      userEntry,
    };

    // Cache the result to avoid recalculating on every page load
    setCachedLeaderboard(result, type, maxEntries, currentUserId);

    return result;
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return {
      entries: [],
      totalParticipants: 0,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Get user's leaderboard position
 */
export async function getUserLeaderboardPosition(userId: string): Promise<{
  rank: number;
  totalParticipants: number;
  score: number;
  percentile: number;
}> {
  const leaderboard = await getLeaderboard("overall", 100, userId);

  if (!leaderboard.userRank || !leaderboard.userEntry) {
    return {
      rank: 0,
      totalParticipants: leaderboard.totalParticipants,
      score: 0,
      percentile: 0,
    };
  }

  const percentile = Math.round(
    ((leaderboard.totalParticipants - leaderboard.userRank) /
      leaderboard.totalParticipants) *
      100
  );

  return {
    rank: leaderboard.userRank,
    totalParticipants: leaderboard.totalParticipants,
    score: leaderboard.userEntry.score,
    percentile,
  };
}

/**
 * Get monthly spotlight members (top performers)
 */
export async function getMonthlySpotlight(): Promise<LeaderboardEntry[]> {
  const leaderboard = await getLeaderboard("overall", 3);
  return leaderboard.entries;
}

/**
 * Get rising stars (members with highest recent growth)
 * This is a simplified version - a full implementation would track historical data
 */
export async function getRisingStars(maxEntries: number = 5): Promise<LeaderboardEntry[]> {
  // For now, get top members by streak (indicates recent activity)
  const leaderboard = await getLeaderboard("streak", maxEntries);
  return leaderboard.entries.filter((e) => e.breakdown.streak > 0);
}
