/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shop Indigenous Analytics Tracking
 *
 * Tracks vendor profile analytics and user engagement.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AnalyticsEventType =
  | "page_view"
  | "profile_view"
  | "website_click"
  | "favorite_add"
  | "favorite_remove"
  | "follow"
  | "unfollow"
  | "share"
  | "search_appear"
  | "category_appear"
  | "contact_click"
  | "social_click";

export interface AnalyticsEvent {
  id: string;
  vendorId: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  referrer?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

export interface DailyStats {
  date: string;
  vendorId: string;
  pageViews: number;
  profileViews: number;
  websiteClicks: number;
  favorites: number;
  follows: number;
  shares: number;
  uniqueVisitors: number;
}

export interface VendorAnalyticsSummary {
  totalViews: number;
  totalClicks: number;
  totalFavorites: number;
  totalFollowers: number;
  viewsLast7Days: number;
  clicksLast7Days: number;
  conversionRate: number;
  dailyStats: DailyStats[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ANALYTICS_COLLECTION = "analyticsEvents";
const DAILY_STATS_COLLECTION = "dailyStats";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("shop_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("shop_session_id", sessionId);
  }
  return sessionId;
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track an analytics event
 */
export async function trackEvent(
  vendorId: string,
  eventType: AnalyticsEventType,
  options?: {
    userId?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, ANALYTICS_COLLECTION);
    const docRef = doc(ref);

    await setDoc(docRef, {
      vendorId,
      eventType,
      userId: options?.userId || null,
      sessionId: getSessionId(),
      referrer: options?.referrer || (typeof document !== "undefined" ? document.referrer : null),
      metadata: options?.metadata || null,
      createdAt: serverTimestamp(),
    });

    // Also update daily stats
    await updateDailyStats(vendorId, eventType);
  } catch (error) {
    // Silently fail analytics - don't break the app
    console.error("Analytics error:", error);
  }
}

/**
 * Track a page/profile view
 */
export async function trackView(
  vendorId: string,
  userId?: string
): Promise<void> {
  await trackEvent(vendorId, "profile_view", { userId });
}

/**
 * Track a website click
 */
export async function trackWebsiteClick(
  vendorId: string,
  userId?: string
): Promise<void> {
  await trackEvent(vendorId, "website_click", { userId });
}

/**
 * Track a share action
 */
export async function trackShare(
  vendorId: string,
  platform: string,
  userId?: string
): Promise<void> {
  await trackEvent(vendorId, "share", {
    userId,
    metadata: { platform },
  });
}

/**
 * Track a social link click
 */
export async function trackSocialClick(
  vendorId: string,
  platform: string,
  userId?: string
): Promise<void> {
  await trackEvent(vendorId, "social_click", {
    userId,
    metadata: { platform },
  });
}

/**
 * Track contact click (email, phone)
 */
export async function trackContactClick(
  vendorId: string,
  contactType: "email" | "phone",
  userId?: string
): Promise<void> {
  await trackEvent(vendorId, "contact_click", {
    userId,
    metadata: { contactType },
  });
}

// ============================================================================
// DAILY STATS
// ============================================================================

/**
 * Update daily stats for a vendor
 */
async function updateDailyStats(
  vendorId: string,
  eventType: AnalyticsEventType
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const dateString = getDateString();
    const statId = `${vendorId}_${dateString}`;
    const ref = doc(firestore, DAILY_STATS_COLLECTION, statId);

    const fieldMap: Record<AnalyticsEventType, string | null> = {
      page_view: null,
      profile_view: "profileViews",
      website_click: "websiteClicks",
      favorite_add: "favorites",
      favorite_remove: null,
      follow: "follows",
      unfollow: null,
      share: "shares",
      search_appear: null,
      category_appear: null,
      contact_click: null,
      social_click: null,
    };

    const field = fieldMap[eventType];
    if (!field) return;

    // Check if document exists
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, {
        [field]: increment(1),
      });
    } else {
      await setDoc(ref, {
        date: dateString,
        vendorId,
        pageViews: 0,
        profileViews: eventType === "profile_view" ? 1 : 0,
        websiteClicks: eventType === "website_click" ? 1 : 0,
        favorites: eventType === "favorite_add" ? 1 : 0,
        follows: eventType === "follow" ? 1 : 0,
        shares: eventType === "share" ? 1 : 0,
        uniqueVisitors: 0,
      });
    }
  } catch (error) {
    console.error("Error updating daily stats:", error);
  }
}

/**
 * Get daily stats for a vendor
 */
export async function getDailyStats(
  vendorId: string,
  days: number = 30
): Promise<DailyStats[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, DAILY_STATS_COLLECTION);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = getDateString(startDate);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      where("date", ">=", startDateString),
      orderBy("date", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
    })) as DailyStats[];
  } catch (error) {
    console.error("Error getting daily stats:", error);
    return [];
  }
}

/**
 * Get analytics summary for a vendor
 */
export async function getVendorAnalyticsSummary(
  vendorId: string
): Promise<VendorAnalyticsSummary> {
  const dailyStats = await getDailyStats(vendorId, 30);

  const last7Days = dailyStats.slice(0, 7);

  const summary: VendorAnalyticsSummary = {
    totalViews: dailyStats.reduce((sum, d) => sum + d.profileViews, 0),
    totalClicks: dailyStats.reduce((sum, d) => sum + d.websiteClicks, 0),
    totalFavorites: dailyStats.reduce((sum, d) => sum + d.favorites, 0),
    totalFollowers: dailyStats.reduce((sum, d) => sum + d.follows, 0),
    viewsLast7Days: last7Days.reduce((sum, d) => sum + d.profileViews, 0),
    clicksLast7Days: last7Days.reduce((sum, d) => sum + d.websiteClicks, 0),
    conversionRate: 0,
    dailyStats,
  };

  // Calculate conversion rate
  if (summary.totalViews > 0) {
    summary.conversionRate = (summary.totalClicks / summary.totalViews) * 100;
  }

  return summary;
}

// ============================================================================
// TRENDING & POPULAR
// ============================================================================

/**
 * Get trending vendors (most views in last 7 days)
 */
export async function getTrendingVendors(
  limitCount: number = 10
): Promise<string[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, DAILY_STATS_COLLECTION);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateString = getDateString(startDate);

    const q = query(
      ref,
      where("date", ">=", startDateString),
      orderBy("date", "desc")
    );

    const snap = await getDocs(q);

    // Aggregate by vendor
    const vendorViews: Record<string, number> = {};
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as DailyStats;
      vendorViews[data.vendorId] = (vendorViews[data.vendorId] || 0) + data.profileViews;
    });

    // Sort by views and return top vendors
    return Object.entries(vendorViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitCount)
      .map(([vendorId]) => vendorId);
  } catch (error) {
    console.error("Error getting trending vendors:", error);
    return [];
  }
}

/**
 * Get recent events for a vendor (for activity feed)
 */
export async function getRecentEvents(
  vendorId: string,
  limitCount: number = 20
): Promise<AnalyticsEvent[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, ANALYTICS_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AnalyticsEvent[];
  } catch (error) {
    console.error("Error getting recent events:", error);
    return [];
  }
}
