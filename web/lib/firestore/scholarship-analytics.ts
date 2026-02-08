/**
 * Scholarship Analytics - Track apply clicks with bot protection
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  db,
  checkFirebase,
} from "./shared";
import type { Firestore } from "./shared";
import type { ScholarshipApplyClickEvent, ScholarshipAdminAuditLog, Scholarship } from "@/lib/types";

// ============================================
// CONSTANTS
// ============================================

const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour
const MAX_CLICKS_PER_SESSION_WINDOW = 1; // Only count 1 click per scholarship per session per hour
const SUSPICIOUS_THRESHOLD_COUNT = 20; // Flag if > 20 scholarships clicked in 1 hour
const SUSPICIOUS_THRESHOLD_WINDOW_MINUTES = 60;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a privacy-safe hash from session/fingerprint data
 * Using simple hash - in production would use crypto
 */
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate dedupe key for rate limiting
 */
function generateDedupeKey(scholarshipId: string, sessionId: string): string {
  const dayBucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const hourBucket = new Date().getHours().toString();
  return generateHash(`${scholarshipId}:${sessionId}:${dayBucket}:${hourBucket}`);
}

/**
 * Get session ID from storage or generate new one
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-side';

  let sessionId = sessionStorage.getItem('iopps_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('iopps_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Generate a privacy-safe fingerprint hash (no raw fingerprint stored)
 */
export function generateFingerprintHash(): string {
  if (typeof window === 'undefined') return 'server-side';

  // Collect non-identifying browser characteristics
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL().slice(-50), // Last 50 chars of canvas data
  ].join('|');

  return generateHash(components);
}

// ============================================
// APPLY CLICK TRACKING
// ============================================

/**
 * Track a scholarship apply click with rate limiting and bot protection
 * Returns true if click was logged, false if deduplicated
 */
export async function trackScholarshipApplyClick(
  scholarshipId: string,
  organizationId: string,
  options: {
    source?: 'web' | 'mobile';
    userId?: string;
    sessionId?: string;
    fingerprintHash?: string;
  } = {}
): Promise<{ logged: boolean; reason?: string }> {
  const firestore = checkFirebase();
  if (!firestore) return { logged: false, reason: 'Firebase not available' };

  const sessionId = options.sessionId || getOrCreateSessionId();
  const fingerprintHash = options.fingerprintHash || generateFingerprintHash();
  const dedupeKey = generateDedupeKey(scholarshipId, sessionId);
  const userType = options.userId ? 'logged-in' : 'anonymous';
  const source = options.source || 'web';

  try {
    // Check for duplicate click within rate limit window
    const dedupeRef = doc(firestore, 'scholarshipClickDedupe', dedupeKey);
    const dedupeDoc = await getDoc(dedupeRef);

    if (dedupeDoc.exists()) {
      // Already logged this click within the window
      return { logged: false, reason: 'deduplicated' };
    }

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousActivity(firestore, sessionId, fingerprintHash);
    if (suspiciousCheck.suspicious) {
      // Log suspicious activity event
      await addDoc(collection(firestore, 'scholarshipAnalyticsSuspicious'), {
        eventType: 'suspicious_apply_activity',
        sessionId,
        fingerprintHash,
        count: suspiciousCheck.count,
        timeWindow: SUSPICIOUS_THRESHOLD_WINDOW_MINUTES,
        timestamp: serverTimestamp(),
      });
      return { logged: false, reason: 'suspicious_activity' };
    }

    // Log the click event
    const event: Omit<ScholarshipApplyClickEvent, 'id'> = {
      scholarshipId,
      organizationId,
      timestamp: serverTimestamp() as any,
      source,
      userType,
      userId: options.userId,
      sessionId,
      fingerprintHash,
      dedupeKey,
    };

    await addDoc(collection(firestore, 'scholarshipApplyClicks'), event);

    // Set dedupe marker (expires after rate limit window - handled by TTL or cleanup job)
    await setDoc(dedupeRef, {
      scholarshipId,
      sessionId,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)),
    });

    // Increment counter on scholarship document
    const scholarshipRef = doc(firestore, 'scholarships', scholarshipId);
    await updateDoc(scholarshipRef, {
      applyClickCount: increment(1),
    });

    return { logged: true };
  } catch (error) {
    console.error('Error tracking scholarship apply click:', error);
    return { logged: false, reason: 'error' };
  }
}

/**
 * Check for suspicious click activity
 */
async function checkSuspiciousActivity(
  firestore: Firestore,
  sessionId: string,
  fingerprintHash: string
): Promise<{ suspicious: boolean; count: number }> {
  try {
    const windowStart = new Date(Date.now() - SUSPICIOUS_THRESHOLD_WINDOW_MINUTES * 60 * 1000);

    const q = query(
      collection(firestore, 'scholarshipApplyClicks'),
      where('sessionId', '==', sessionId),
      where('timestamp', '>=', Timestamp.fromDate(windowStart)),
      limit(SUSPICIOUS_THRESHOLD_COUNT + 1)
    );

    const snapshot = await getDocs(q);
    const count = snapshot.size;

    return {
      suspicious: count >= SUSPICIOUS_THRESHOLD_COUNT,
      count,
    };
  } catch {
    return { suspicious: false, count: 0 };
  }
}

// ============================================
// ANALYTICS QUERIES
// ============================================

/**
 * Get apply click stats for a scholarship
 */
export async function getScholarshipApplyClickStats(
  scholarshipId: string,
  days: number = 30
): Promise<{
  total: number;
  uniqueSessions: number;
  bySource: { web: number; mobile: number };
  byUserType: { anonymous: number; loggedIn: number };
  recentClicks: ScholarshipApplyClickEvent[];
}> {
  const firestore = checkFirebase();
  if (!firestore) {
    return {
      total: 0,
      uniqueSessions: 0,
      bySource: { web: 0, mobile: 0 },
      byUserType: { anonymous: 0, loggedIn: 0 },
      recentClicks: [],
    };
  }

  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const q = query(
      collection(firestore, 'scholarshipApplyClicks'),
      where('scholarshipId', '==', scholarshipId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    const snapshot = await getDocs(q);
    const clicks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScholarshipApplyClickEvent[];

    const uniqueSessions = new Set(clicks.map(c => c.sessionId)).size;
    const webClicks = clicks.filter(c => c.source === 'web').length;
    const mobileClicks = clicks.filter(c => c.source === 'mobile').length;
    const anonymousClicks = clicks.filter(c => c.userType === 'anonymous').length;
    const loggedInClicks = clicks.filter(c => c.userType === 'logged-in').length;

    return {
      total: clicks.length,
      uniqueSessions,
      bySource: { web: webClicks, mobile: mobileClicks },
      byUserType: { anonymous: anonymousClicks, loggedIn: loggedInClicks },
      recentClicks: clicks.slice(0, 20),
    };
  } catch (error) {
    console.error('Error getting scholarship apply click stats:', error);
    return {
      total: 0,
      uniqueSessions: 0,
      bySource: { web: 0, mobile: 0 },
      byUserType: { anonymous: 0, loggedIn: 0 },
      recentClicks: [],
    };
  }
}

/**
 * Get apply click stats for an organization's scholarships
 */
export async function getOrganizationScholarshipAnalytics(
  organizationId: string,
  days: number = 30
): Promise<{
  totalClicks: number;
  scholarshipBreakdown: { scholarshipId: string; clicks: number }[];
}> {
  const firestore = checkFirebase();
  if (!firestore) {
    return { totalClicks: 0, scholarshipBreakdown: [] };
  }

  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const q = query(
      collection(firestore, 'scholarshipApplyClicks'),
      where('organizationId', '==', organizationId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      limit(5000)
    );

    const snapshot = await getDocs(q);
    const clicks = snapshot.docs.map(doc => doc.data());

    // Group by scholarship
    const breakdownMap = new Map<string, number>();
    clicks.forEach(click => {
      const current = breakdownMap.get(click.scholarshipId) || 0;
      breakdownMap.set(click.scholarshipId, current + 1);
    });

    const scholarshipBreakdown = Array.from(breakdownMap.entries())
      .map(([scholarshipId, clicks]) => ({ scholarshipId, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    return {
      totalClicks: clicks.length,
      scholarshipBreakdown,
    };
  } catch (error) {
    console.error('Error getting organization scholarship analytics:', error);
    return { totalClicks: 0, scholarshipBreakdown: [] };
  }
}

// ============================================
// ADMIN AUDIT LOGGING
// ============================================

/**
 * Log an admin action on a scholarship
 */
export async function logScholarshipAdminAction(
  action: Omit<ScholarshipAdminAuditLog, 'id' | 'timestamp'>
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const docRef = await addDoc(collection(firestore, 'scholarshipAdminAuditLog'), {
      ...action,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error logging scholarship admin action:', error);
    return null;
  }
}

/**
 * Get admin audit log for a scholarship
 */
export async function getScholarshipAdminAuditLog(
  scholarshipId: string,
  limitCount: number = 50
): Promise<ScholarshipAdminAuditLog[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, 'scholarshipAdminAuditLog'),
      where('scholarshipId', '==', scholarshipId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScholarshipAdminAuditLog[];
  } catch (error) {
    console.error('Error getting scholarship admin audit log:', error);
    return [];
  }
}

// ============================================
// EXPIRATION HELPERS
// ============================================

/**
 * Check if a scholarship is expired based on deadline
 */
export function isScholarshipExpired(scholarship: Scholarship): boolean {
  if (!scholarship.deadline) return false;

  let deadlineDate: Date;
  if (scholarship.deadline instanceof Date) {
    deadlineDate = scholarship.deadline;
  } else if (typeof scholarship.deadline === 'string') {
    deadlineDate = new Date(scholarship.deadline);
  } else if ('toDate' in scholarship.deadline) {
    deadlineDate = scholarship.deadline.toDate();
  } else {
    return false;
  }

  return deadlineDate < new Date();
}

/**
 * Get scholarships expiring soon (for notification purposes)
 */
export async function getScholarshipsExpiringSoon(
  daysAhead: number = 7
): Promise<Scholarship[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const now = new Date();
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const q = query(
      collection(firestore, 'scholarships'),
      where('active', '==', true),
      where('deadline', '>=', Timestamp.fromDate(now)),
      where('deadline', '<=', Timestamp.fromDate(futureDate)),
      orderBy('deadline', 'asc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Scholarship[];
  } catch (error) {
    console.error('Error getting scholarships expiring soon:', error);
    return [];
  }
}
