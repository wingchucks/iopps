// Analytics and tracking Firestore operations
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
  outboundClicksCollection,
  profileViewsCollection,
} from "./shared";
import type { OutboundClickEvent, OutboundLinkType, ClickStats, ViewStats } from "@/lib/types";

/**
 * Track an outbound link click
 */
export async function trackOutboundClick(
  event: Omit<OutboundClickEvent, 'id' | 'createdAt'>
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const docRef = await addDoc(collection(firestore, outboundClicksCollection), {
      ...event,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking outbound click:", error);
    return null;
  }
}

/**
 * Track a profile view
 */
export async function trackProfileView(
  organizationId: string,
  vendorId?: string,
  visitorId?: string
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const docRef = await addDoc(collection(firestore, profileViewsCollection), {
      organizationId,
      vendorId,
      visitorId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking profile view:", error);
    return null;
  }
}

/**
 * Get outbound click statistics for an organization
 */
export async function getOutboundClickStats(
  organizationId: string,
  days: number = 30
): Promise<ClickStats> {
  const firestore = checkFirebase();
  const defaultStats: ClickStats = {
    total: 0,
    byLinkType: {
      website: 0,
      instagram: 0,
      facebook: 0,
      tiktok: 0,
      linkedin: 0,
      booking: 0,
      phone: 0,
      email: 0,
      other: 0,
    },
    byDay: [],
  };

  if (!firestore) return defaultStats;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);

    const clicksQuery = query(
      collection(firestore, outboundClicksCollection),
      where("organizationId", "==", organizationId),
      where("createdAt", ">=", startTimestamp),
      orderBy("createdAt", "desc"),
      limit(1000)
    );

    const snap = await getDocs(clicksQuery);

    const stats: ClickStats = {
      total: snap.size,
      byLinkType: { ...defaultStats.byLinkType },
      byDay: [],
    };

    // Group by day and link type
    const dayMap = new Map<string, number>();

    snap.forEach(docSnap => {
      const data = docSnap.data() as OutboundClickEvent;

      // Count by link type
      const linkType = data.linkType as OutboundLinkType;
      if (linkType in stats.byLinkType) {
        stats.byLinkType[linkType]++;
      } else {
        stats.byLinkType.other++;
      }

      // Count by day
      if (data.createdAt) {
        const date = data.createdAt instanceof Date
          ? data.createdAt
          : (data.createdAt as Timestamp).toDate();
        const dateStr = date.toISOString().split('T')[0];
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }
    });

    // Convert day map to array
    stats.byDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  } catch (error) {
    console.error("Error getting outbound click stats:", error);
    return defaultStats;
  }
}

/**
 * Get profile view statistics for an organization
 */
export async function getProfileViewStats(
  organizationId: string,
  days: number = 30
): Promise<ViewStats> {
  const firestore = checkFirebase();
  const defaultStats: ViewStats = {
    total: 0,
    byDay: [],
  };

  if (!firestore) return defaultStats;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);

    const viewsQuery = query(
      collection(firestore, profileViewsCollection),
      where("organizationId", "==", organizationId),
      where("createdAt", ">=", startTimestamp),
      orderBy("createdAt", "desc"),
      limit(1000)
    );

    const snap = await getDocs(viewsQuery);

    const stats: ViewStats = {
      total: snap.size,
      byDay: [],
    };

    // Group by day
    const dayMap = new Map<string, number>();

    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.createdAt) {
        const date = data.createdAt instanceof Date
          ? data.createdAt
          : (data.createdAt as Timestamp).toDate();
        const dateStr = date.toISOString().split('T')[0];
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }
    });

    // Convert day map to array
    stats.byDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  } catch (error) {
    console.error("Error getting profile view stats:", error);
    return defaultStats;
  }
}

/**
 * Get combined analytics summary for organization dashboard
 */
export async function getAnalyticsSummary(
  organizationId: string,
  days: number = 30
): Promise<{
  profileViews: ViewStats;
  outboundClicks: ClickStats;
  topLinks: { linkType: OutboundLinkType; count: number }[];
}> {
  const [profileViews, outboundClicks] = await Promise.all([
    getProfileViewStats(organizationId, days),
    getOutboundClickStats(organizationId, days),
  ]);

  // Get top links sorted by count
  const topLinks = Object.entries(outboundClicks.byLinkType)
    .map(([linkType, count]) => ({ linkType: linkType as OutboundLinkType, count }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    profileViews,
    outboundClicks,
    topLinks,
  };
}

/**
 * Get recent outbound clicks for activity feed
 */
export async function getRecentOutboundClicks(
  organizationId: string,
  maxItems: number = 10
): Promise<OutboundClickEvent[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const clicksQuery = query(
      collection(firestore, outboundClicksCollection),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );

    const snap = await getDocs(clicksQuery);

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as OutboundClickEvent));
  } catch (error) {
    console.error("Error getting recent outbound clicks:", error);
    return [];
  }
}

/**
 * Track a profile view with additional metadata (for public org pages)
 */
export async function trackOrganizationProfileView(params: {
  organizationId: string;
  slug: string;
  visitorId?: string;
  referrer?: string;
  userAgent?: string;
}): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const docRef = await addDoc(collection(firestore, profileViewsCollection), {
      organizationId: params.organizationId,
      slug: params.slug,
      visitorId: params.visitorId || null,
      referrer: params.referrer || null,
      userAgent: params.userAgent || null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking organization profile view:", error);
    return null;
  }
}

/**
 * Track outbound link click with all metadata
 */
export async function trackOrganizationOutboundClick(params: {
  organizationId: string;
  linkType: OutboundLinkType;
  targetUrl: string;
  slug?: string;
  vendorId?: string;
  offeringId?: string;
  visitorId?: string;
  referrer?: string;
}): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const docRef = await addDoc(collection(firestore, outboundClicksCollection), {
      organizationId: params.organizationId,
      linkType: params.linkType,
      targetUrl: params.targetUrl,
      slug: params.slug || null,
      vendorId: params.vendorId || null,
      offeringId: params.offeringId || null,
      visitorId: params.visitorId || null,
      referrer: params.referrer || null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking organization outbound click:", error);
    return null;
  }
}

/**
 * Get total profile view count for an organization
 */
export async function getTotalProfileViews(organizationId: string): Promise<number> {
  const firestore = checkFirebase();
  if (!firestore) return 0;

  try {
    const viewsQuery = query(
      collection(firestore, profileViewsCollection),
      where("organizationId", "==", organizationId),
      limit(1000)
    );

    const snap = await getDocs(viewsQuery);
    return snap.size;
  } catch (error) {
    console.error("Error getting total profile views:", error);
    return 0;
  }
}

/**
 * Get total outbound click count for an organization
 */
export async function getTotalOutboundClicks(organizationId: string): Promise<number> {
  const firestore = checkFirebase();
  if (!firestore) return 0;

  try {
    const clicksQuery = query(
      collection(firestore, outboundClicksCollection),
      where("organizationId", "==", organizationId),
      limit(1000)
    );

    const snap = await getDocs(clicksQuery);
    return snap.size;
  } catch (error) {
    console.error("Error getting total outbound clicks:", error);
    return 0;
  }
}
