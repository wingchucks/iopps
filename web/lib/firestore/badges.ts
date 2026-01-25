// Achievement Badge System
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  checkFirebase,
} from "./shared";

// Collection for user badges
const userBadgesCollection = "user_badges";

// ============================================
// BADGE DEFINITIONS
// ============================================

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "profile" | "connections" | "applications" | "community" | "special";
  tier: "bronze" | "silver" | "gold" | "platinum";
  requirement: {
    type: "profile_complete" | "connections" | "applications" | "posts" | "profile_views" | "streak" | "special";
    threshold: number;
  };
  points: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Profile Badges
  {
    id: "profile_pioneer",
    name: "Profile Pioneer",
    description: "Complete your profile basics (name, photo, bio)",
    icon: "user-check",
    category: "profile",
    tier: "bronze",
    requirement: { type: "profile_complete", threshold: 30 },
    points: 10,
  },
  {
    id: "profile_pro",
    name: "Profile Pro",
    description: "Complete 70% of your profile",
    icon: "user-cog",
    category: "profile",
    tier: "silver",
    requirement: { type: "profile_complete", threshold: 70 },
    points: 25,
  },
  {
    id: "profile_allstar",
    name: "Profile All-Star",
    description: "Achieve 100% profile completion",
    icon: "star",
    category: "profile",
    tier: "gold",
    requirement: { type: "profile_complete", threshold: 100 },
    points: 50,
  },

  // Connection Badges
  {
    id: "first_connection",
    name: "Making Friends",
    description: "Make your first connection",
    icon: "user-plus",
    category: "connections",
    tier: "bronze",
    requirement: { type: "connections", threshold: 1 },
    points: 10,
  },
  {
    id: "networker",
    name: "Networker",
    description: "Connect with 10 community members",
    icon: "users",
    category: "connections",
    tier: "silver",
    requirement: { type: "connections", threshold: 10 },
    points: 25,
  },
  {
    id: "community_builder",
    name: "Community Builder",
    description: "Build a network of 50 connections",
    icon: "network",
    category: "connections",
    tier: "gold",
    requirement: { type: "connections", threshold: 50 },
    points: 75,
  },
  {
    id: "connector_elite",
    name: "Connector Elite",
    description: "Achieve 100 connections",
    icon: "globe",
    category: "connections",
    tier: "platinum",
    requirement: { type: "connections", threshold: 100 },
    points: 150,
  },

  // Application Badges
  {
    id: "first_application",
    name: "Taking Action",
    description: "Submit your first job application",
    icon: "send",
    category: "applications",
    tier: "bronze",
    requirement: { type: "applications", threshold: 1 },
    points: 10,
  },
  {
    id: "active_seeker",
    name: "Active Seeker",
    description: "Apply to 10 jobs",
    icon: "briefcase",
    category: "applications",
    tier: "silver",
    requirement: { type: "applications", threshold: 10 },
    points: 30,
  },
  {
    id: "dedicated_applicant",
    name: "Dedicated Applicant",
    description: "Submit 25 job applications",
    icon: "target",
    category: "applications",
    tier: "gold",
    requirement: { type: "applications", threshold: 25 },
    points: 75,
  },

  // Community Badges
  {
    id: "first_post",
    name: "Finding My Voice",
    description: "Create your first community post",
    icon: "message-square",
    category: "community",
    tier: "bronze",
    requirement: { type: "posts", threshold: 1 },
    points: 10,
  },
  {
    id: "active_contributor",
    name: "Active Contributor",
    description: "Share 10 posts with the community",
    icon: "message-circle",
    category: "community",
    tier: "silver",
    requirement: { type: "posts", threshold: 10 },
    points: 40,
  },
  {
    id: "thought_leader",
    name: "Thought Leader",
    description: "Create 25 community posts",
    icon: "award",
    category: "community",
    tier: "gold",
    requirement: { type: "posts", threshold: 25 },
    points: 100,
  },

  // Visibility Badges
  {
    id: "getting_noticed",
    name: "Getting Noticed",
    description: "Receive 25 profile views",
    icon: "eye",
    category: "profile",
    tier: "bronze",
    requirement: { type: "profile_views", threshold: 25 },
    points: 15,
  },
  {
    id: "rising_star",
    name: "Rising Star",
    description: "Reach 100 profile views",
    icon: "trending-up",
    category: "profile",
    tier: "silver",
    requirement: { type: "profile_views", threshold: 100 },
    points: 40,
  },
  {
    id: "community_spotlight",
    name: "Community Spotlight",
    description: "Achieve 500 profile views",
    icon: "sun",
    category: "profile",
    tier: "gold",
    requirement: { type: "profile_views", threshold: 500 },
    points: 100,
  },
];

// ============================================
// USER BADGE INTERFACE
// ============================================

export interface UserBadge {
  id: string;
  badgeId: string;
  userId: string;
  earnedAt: Timestamp;
  notified: boolean;
}

export interface UserBadgeWithDefinition extends UserBadge {
  badge: BadgeDefinition;
}

// ============================================
// BADGE FUNCTIONS
// ============================================

/**
 * Get all badges earned by a user
 */
export async function getUserBadges(userId: string): Promise<UserBadgeWithDefinition[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, userBadgesCollection),
      where("userId", "==", userId)
    );

    const snap = await getDocs(q);
    const userBadges = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBadge));

    // Attach badge definitions
    return userBadges
      .map((ub) => {
        const badge = BADGE_DEFINITIONS.find((b) => b.id === ub.badgeId);
        if (!badge) return null;
        return { ...ub, badge };
      })
      .filter((b): b is UserBadgeWithDefinition => b !== null)
      .sort((a, b) => b.earnedAt.seconds - a.earnedAt.seconds);
  } catch (error) {
    console.error("Error getting user badges:", error);
    return [];
  }
}

/**
 * Check if a user has a specific badge
 */
export async function hasBadge(userId: string, badgeId: string): Promise<boolean> {
  const firestore = checkFirebase();
  if (!firestore) return false;

  try {
    const q = query(
      collection(firestore, userBadgesCollection),
      where("userId", "==", userId),
      where("badgeId", "==", badgeId)
    );

    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error("Error checking badge:", error);
    return false;
  }
}

/**
 * Award a badge to a user
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const firestore = checkFirebase();
  if (!firestore) return false;

  // Check if badge exists
  const badgeDef = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
  if (!badgeDef) {
    console.error("Badge definition not found:", badgeId);
    return false;
  }

  // Check if already earned
  const alreadyEarned = await hasBadge(userId, badgeId);
  if (alreadyEarned) return false;

  try {
    const docRef = doc(collection(firestore, userBadgesCollection));
    await setDoc(docRef, {
      badgeId,
      userId,
      earnedAt: serverTimestamp(),
      notified: false,
    });
    return true;
  } catch (error) {
    console.error("Error awarding badge:", error);
    return false;
  }
}

/**
 * Mark badge notification as shown
 */
export async function markBadgeNotified(userBadgeId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const ref = doc(firestore, userBadgesCollection, userBadgeId);
    await setDoc(ref, { notified: true }, { merge: true });
  } catch (error) {
    console.error("Error marking badge notified:", error);
  }
}

/**
 * Get unnotified badges for a user
 */
export async function getUnnotifiedBadges(userId: string): Promise<UserBadgeWithDefinition[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, userBadgesCollection),
      where("userId", "==", userId),
      where("notified", "==", false)
    );

    const snap = await getDocs(q);
    const userBadges = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBadge));

    return userBadges
      .map((ub) => {
        const badge = BADGE_DEFINITIONS.find((b) => b.id === ub.badgeId);
        if (!badge) return null;
        return { ...ub, badge };
      })
      .filter((b): b is UserBadgeWithDefinition => b !== null);
  } catch (error) {
    console.error("Error getting unnotified badges:", error);
    return [];
  }
}

/**
 * Check and award eligible badges based on user stats
 */
export async function checkAndAwardBadges(
  userId: string,
  stats: {
    profileCompletion?: number;
    connections?: number;
    applications?: number;
    posts?: number;
    profileViews?: number;
  }
): Promise<string[]> {
  const awardedBadges: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    let eligible = false;

    switch (badge.requirement.type) {
      case "profile_complete":
        eligible = (stats.profileCompletion || 0) >= badge.requirement.threshold;
        break;
      case "connections":
        eligible = (stats.connections || 0) >= badge.requirement.threshold;
        break;
      case "applications":
        eligible = (stats.applications || 0) >= badge.requirement.threshold;
        break;
      case "posts":
        eligible = (stats.posts || 0) >= badge.requirement.threshold;
        break;
      case "profile_views":
        eligible = (stats.profileViews || 0) >= badge.requirement.threshold;
        break;
    }

    if (eligible) {
      const awarded = await awardBadge(userId, badge.id);
      if (awarded) {
        awardedBadges.push(badge.id);
      }
    }
  }

  return awardedBadges;
}

/**
 * Get total points from earned badges
 */
export async function getUserBadgePoints(userId: string): Promise<number> {
  const badges = await getUserBadges(userId);
  return badges.reduce((total, b) => total + b.badge.points, 0);
}

/**
 * Get badge progress for a user
 */
export function getBadgeProgress(
  stats: {
    profileCompletion?: number;
    connections?: number;
    applications?: number;
    posts?: number;
    profileViews?: number;
  },
  earnedBadgeIds: string[]
): { badge: BadgeDefinition; progress: number; earned: boolean }[] {
  return BADGE_DEFINITIONS.map((badge) => {
    const earned = earnedBadgeIds.includes(badge.id);
    let current = 0;

    switch (badge.requirement.type) {
      case "profile_complete":
        current = stats.profileCompletion || 0;
        break;
      case "connections":
        current = stats.connections || 0;
        break;
      case "applications":
        current = stats.applications || 0;
        break;
      case "posts":
        current = stats.posts || 0;
        break;
      case "profile_views":
        current = stats.profileViews || 0;
        break;
    }

    const progress = Math.min(100, Math.round((current / badge.requirement.threshold) * 100));

    return { badge, progress, earned };
  });
}

/**
 * Get tier color for a badge
 */
export function getTierColor(tier: BadgeDefinition["tier"]): string {
  switch (tier) {
    case "bronze":
      return "from-amber-700 to-amber-500";
    case "silver":
      return "from-slate-400 to-slate-300";
    case "gold":
      return "from-yellow-500 to-amber-400";
    case "platinum":
      return "from-cyan-400 to-teal-300";
    default:
      return "from-slate-600 to-slate-500";
  }
}

/**
 * Get tier border color for a badge
 */
export function getTierBorderColor(tier: BadgeDefinition["tier"]): string {
  switch (tier) {
    case "bronze":
      return "border-amber-600/50";
    case "silver":
      return "border-slate-400/50";
    case "gold":
      return "border-yellow-500/50";
    case "platinum":
      return "border-cyan-400/50";
    default:
      return "border-slate-600/50";
  }
}
