// Member engagement tracking and statistics
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
  checkFirebase,
  applicationsCollection,
} from "./shared";

// Collection for member profile views
const memberProfileViewsCollection = "member_profile_views";
const connectionsCollection = "connections";
const postsCollection = "posts";

// ============================================
// MEMBER PROFILE VIEW TRACKING
// ============================================

export interface MemberProfileView {
  id: string;
  memberId: string;
  visitorId?: string;
  visitorName?: string;
  visitorType?: "member" | "employer" | "anonymous";
  referrer?: string;
  createdAt: Timestamp;
}

/**
 * Track when someone views a member's profile
 */
export async function trackMemberProfileView(params: {
  memberId: string;
  visitorId?: string;
  visitorName?: string;
  visitorType?: "member" | "employer" | "anonymous";
  referrer?: string;
}): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  // Don't track if member is viewing their own profile
  if (params.visitorId === params.memberId) return null;

  try {
    const docRef = await addDoc(collection(firestore, memberProfileViewsCollection), {
      memberId: params.memberId,
      visitorId: params.visitorId || null,
      visitorName: params.visitorName || null,
      visitorType: params.visitorType || "anonymous",
      referrer: params.referrer || null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking member profile view:", error);
    return null;
  }
}

/**
 * Get member profile view statistics
 */
export async function getMemberProfileViews(
  memberId: string,
  days: number = 30
): Promise<{
  total: number;
  thisWeek: number;
  byDay: { date: string; count: number }[];
  recentViewers: { id?: string; name?: string; type: string; date: Date }[];
}> {
  const firestore = checkFirebase();
  const defaultStats = {
    total: 0,
    thisWeek: 0,
    byDay: [],
    recentViewers: [],
  };

  if (!firestore) return defaultStats;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const viewsQuery = query(
      collection(firestore, memberProfileViewsCollection),
      where("memberId", "==", memberId),
      where("createdAt", ">=", startTimestamp),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(viewsQuery);

    const dayMap = new Map<string, number>();
    const recentViewers: { id?: string; name?: string; type: string; date: Date }[] = [];
    let thisWeek = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const date = data.createdAt?.toDate() || new Date();
      const dateStr = date.toISOString().split("T")[0];

      dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);

      if (date >= weekAgo) {
        thisWeek++;
      }

      // Track recent viewers (up to 10)
      if (recentViewers.length < 10 && data.visitorId) {
        recentViewers.push({
          id: data.visitorId,
          name: data.visitorName,
          type: data.visitorType || "anonymous",
          date,
        });
      }
    });

    const byDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: snap.size,
      thisWeek,
      byDay,
      recentViewers,
    };
  } catch (error) {
    console.error("Error getting member profile views:", error);
    return defaultStats;
  }
}

// ============================================
// MEMBER ENGAGEMENT STATISTICS
// ============================================

export interface MemberEngagementStats {
  profileViews: {
    total: number;
    thisWeek: number;
    trend: "up" | "down" | "stable";
  };
  connections: {
    total: number;
    pending: number;
    thisMonth: number;
  };
  posts: {
    total: number;
    totalLikes: number;
    totalComments: number;
  };
  applications: {
    total: number;
    active: number;
    reviewed: number;
    thisMonth: number;
  };
  messages: {
    conversations: number;
    unread: number;
  };
}

/**
 * Get comprehensive engagement stats for a member
 */
export async function getMemberEngagementStats(
  memberId: string
): Promise<MemberEngagementStats> {
  const firestore = checkFirebase();

  const defaultStats: MemberEngagementStats = {
    profileViews: { total: 0, thisWeek: 0, trend: "stable" },
    connections: { total: 0, pending: 0, thisMonth: 0 },
    posts: { total: 0, totalLikes: 0, totalComments: 0 },
    applications: { total: 0, active: 0, reviewed: 0, thisMonth: 0 },
    messages: { conversations: 0, unread: 0 },
  };

  if (!firestore) return defaultStats;

  try {
    // Get all stats in parallel
    const [profileViewStats, connectionStats, postStats, applicationStats] =
      await Promise.all([
        getMemberProfileViews(memberId, 30),
        getConnectionStats(memberId),
        getPostStats(memberId),
        getApplicationStats(memberId),
      ]);

    // Determine profile view trend
    const lastWeekViews = profileViewStats.thisWeek;
    const previousWeekViews = profileViewStats.total - lastWeekViews;
    let trend: "up" | "down" | "stable" = "stable";
    if (lastWeekViews > previousWeekViews * 1.2) trend = "up";
    else if (lastWeekViews < previousWeekViews * 0.8) trend = "down";

    return {
      profileViews: {
        total: profileViewStats.total,
        thisWeek: profileViewStats.thisWeek,
        trend,
      },
      connections: connectionStats,
      posts: postStats,
      applications: applicationStats,
      messages: { conversations: 0, unread: 0 }, // Placeholder - filled by messaging module
    };
  } catch (error) {
    console.error("Error getting member engagement stats:", error);
    return defaultStats;
  }
}

/**
 * Get connection statistics for a member
 */
async function getConnectionStats(memberId: string): Promise<{
  total: number;
  pending: number;
  thisMonth: number;
}> {
  const firestore = checkFirebase();
  if (!firestore) return { total: 0, pending: 0, thisMonth: 0 };

  try {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthTimestamp = Timestamp.fromDate(monthAgo);

    // Get accepted connections where member is requester
    const q1 = query(
      collection(firestore, connectionsCollection),
      where("requesterId", "==", memberId),
      where("status", "==", "accepted")
    );

    // Get accepted connections where member is recipient
    const q2 = query(
      collection(firestore, connectionsCollection),
      where("recipientId", "==", memberId),
      where("status", "==", "accepted")
    );

    // Get pending requests sent to member
    const q3 = query(
      collection(firestore, connectionsCollection),
      where("recipientId", "==", memberId),
      where("status", "==", "pending")
    );

    const [snap1, snap2, snap3] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      getDocs(q3),
    ]);

    const allConnections = [...snap1.docs, ...snap2.docs];
    const thisMonth = allConnections.filter((d) => {
      const connectedAt = d.data().connectedAt;
      return connectedAt && connectedAt.toDate() >= monthAgo;
    }).length;

    return {
      total: allConnections.length,
      pending: snap3.size,
      thisMonth,
    };
  } catch (error) {
    console.error("Error getting connection stats:", error);
    return { total: 0, pending: 0, thisMonth: 0 };
  }
}

/**
 * Get post statistics for a member
 */
async function getPostStats(memberId: string): Promise<{
  total: number;
  totalLikes: number;
  totalComments: number;
}> {
  const firestore = checkFirebase();
  if (!firestore) return { total: 0, totalLikes: 0, totalComments: 0 };

  try {
    const postsQuery = query(
      collection(firestore, postsCollection),
      where("authorId", "==", memberId)
    );

    const snap = await getDocs(postsQuery);

    let totalLikes = 0;
    let totalComments = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      totalLikes += data.likesCount || 0;
      totalComments += data.commentsCount || 0;
    });

    return {
      total: snap.size,
      totalLikes,
      totalComments,
    };
  } catch (error) {
    console.error("Error getting post stats:", error);
    return { total: 0, totalLikes: 0, totalComments: 0 };
  }
}

/**
 * Get application statistics for a member
 */
async function getApplicationStats(memberId: string): Promise<{
  total: number;
  active: number;
  reviewed: number;
  thisMonth: number;
}> {
  const firestore = checkFirebase();
  if (!firestore) return { total: 0, active: 0, reviewed: 0, thisMonth: 0 };

  try {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const appsQuery = query(
      collection(firestore, applicationsCollection),
      where("memberId", "==", memberId)
    );

    const snap = await getDocs(appsQuery);

    let active = 0;
    let reviewed = 0;
    let thisMonth = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      const createdAt = data.createdAt?.toDate();

      if (status === "submitted" || status === "pending") active++;
      if (status === "reviewed" || status === "shortlisted") reviewed++;
      if (createdAt && createdAt >= monthAgo) thisMonth++;
    });

    return {
      total: snap.size,
      active,
      reviewed,
      thisMonth,
    };
  } catch (error) {
    console.error("Error getting application stats:", error);
    return { total: 0, active: 0, reviewed: 0, thisMonth: 0 };
  }
}

// ============================================
// ENGAGEMENT MILESTONES
// ============================================

export interface EngagementMilestone {
  id: string;
  type: "profile_views" | "connections" | "posts" | "applications";
  threshold: number;
  label: string;
  achieved: boolean;
  achievedAt?: Timestamp;
}

/**
 * Check which engagement milestones a member has achieved
 */
export function checkMilestones(stats: MemberEngagementStats): EngagementMilestone[] {
  const milestones: EngagementMilestone[] = [
    // Profile view milestones
    {
      id: "views_10",
      type: "profile_views",
      threshold: 10,
      label: "First 10 Profile Views",
      achieved: stats.profileViews.total >= 10,
    },
    {
      id: "views_50",
      type: "profile_views",
      threshold: 50,
      label: "50 Profile Views",
      achieved: stats.profileViews.total >= 50,
    },
    {
      id: "views_100",
      type: "profile_views",
      threshold: 100,
      label: "100 Profile Views",
      achieved: stats.profileViews.total >= 100,
    },
    // Connection milestones
    {
      id: "connections_5",
      type: "connections",
      threshold: 5,
      label: "First 5 Connections",
      achieved: stats.connections.total >= 5,
    },
    {
      id: "connections_25",
      type: "connections",
      threshold: 25,
      label: "25 Connections",
      achieved: stats.connections.total >= 25,
    },
    {
      id: "connections_100",
      type: "connections",
      threshold: 100,
      label: "Community Builder (100)",
      achieved: stats.connections.total >= 100,
    },
    // Post milestones
    {
      id: "posts_1",
      type: "posts",
      threshold: 1,
      label: "First Post",
      achieved: stats.posts.total >= 1,
    },
    {
      id: "posts_10",
      type: "posts",
      threshold: 10,
      label: "10 Posts",
      achieved: stats.posts.total >= 10,
    },
    // Application milestones
    {
      id: "apps_1",
      type: "applications",
      threshold: 1,
      label: "First Application",
      achieved: stats.applications.total >= 1,
    },
    {
      id: "apps_10",
      type: "applications",
      threshold: 10,
      label: "10 Applications",
      achieved: stats.applications.total >= 10,
    },
    {
      id: "apps_25",
      type: "applications",
      threshold: 25,
      label: "Dedicated Job Seeker (25)",
      achieved: stats.applications.total >= 25,
    },
  ];

  return milestones;
}

/**
 * Get percentage of milestones achieved
 */
export function getMilestoneProgress(stats: MemberEngagementStats): {
  achieved: number;
  total: number;
  percentage: number;
} {
  const milestones = checkMilestones(stats);
  const achieved = milestones.filter((m) => m.achieved).length;
  return {
    achieved,
    total: milestones.length,
    percentage: Math.round((achieved / milestones.length) * 100),
  };
}
