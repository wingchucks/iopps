/**
 * Organization Directory Visibility - Canonical Computation
 *
 * This module provides the single source of truth for computing organization
 * visibility in the public directory and search.
 *
 * BUSINESS RULES:
 * An org is visible in directory + search if:
 *   - approvalStatus === 'approved'
 *   AND (isGrandfathered === true OR directoryVisibleUntil > now)
 *
 * Engagement that extends visibility:
 *   - Jobs: Standard +30 days, Featured +45 days from publishedAt
 *   - Employer subscriptions: visible until expiresAt (if active)
 *   - Vendor subscriptions: visible until expiresAt (if active)
 *   - Grandfathered: permanent visibility
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  VisibilityReason,
  VisibilitySource,
  VisibilitySourceDetails,
} from "@/lib/types";

// Constants for visibility duration
const STANDARD_JOB_VISIBILITY_DAYS = 30;
const FEATURED_JOB_VISIBILITY_DAYS = 45;

// Tie-breaker priority for visibility reasons (higher = higher priority)
const VISIBILITY_PRIORITY: Record<VisibilitySource, number> = {
  subscription: 4,
  vendor: 3,
  featured_job: 2,
  job: 1,
  none: 0,
};

interface RecomputeOptions {
  /** If true, forces recompute even if recently computed */
  force?: boolean;
  /** Dry run - compute but don't write */
  dryRun?: boolean;
}

// Local source details type using Date (not Timestamp) for internal computation
interface LocalSourceDetails {
  maxSource: VisibilitySource;
  maxUntil?: Date | null;
  subscriptionUntil?: Date | null;
  vendorUntil?: Date | null;
  jobsMaxUntil?: Date | null;
  featuredJobsMaxUntil?: Date | null;
  eligibleJobsCount?: number;
}

interface RecomputeResult {
  orgId: string;
  success: boolean;
  isDirectoryVisible: boolean;
  visibilityReason: VisibilityReason;
  directoryVisibleUntil: Date | null;
  sourceDetails: LocalSourceDetails;
  error?: string;
}

/**
 * Convert various timestamp formats to Date safely
 */
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (typeof ts.toDate === "function") return ts.toDate();
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === "number") return new Date(ts);
  return null;
}

/**
 * Convert Date to Firestore Timestamp
 */
function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the maximum date from an array, or null if empty
 */
function maxDate(dates: (Date | null)[]): Date | null {
  const validDates = dates.filter((d): d is Date => d !== null);
  if (validDates.length === 0) return null;
  return new Date(Math.max(...validDates.map((d) => d.getTime())));
}

/**
 * Determine the visibility reason based on which source produced the max date
 */
function determineVisibilityReason(
  isVisible: boolean,
  sourceDetails: LocalSourceDetails
): VisibilityReason {
  if (!isVisible) return "expired";

  const { maxSource } = sourceDetails;
  switch (maxSource) {
    case "subscription":
      return "subscription";
    case "vendor":
      return "vendor";
    case "featured_job":
      return "featured_job";
    case "job":
      return "job";
    default:
      return "expired";
  }
}

/**
 * Compute which source provides the maximum visibility date
 */
function computeSourceDetails(
  subscriptionUntil: Date | null,
  vendorUntil: Date | null,
  featuredJobsMaxUntil: Date | null,
  jobsMaxUntil: Date | null,
  eligibleJobsCount: number
): LocalSourceDetails {
  const candidates: { source: VisibilitySource; until: Date | null }[] = [
    { source: "subscription", until: subscriptionUntil },
    { source: "vendor", until: vendorUntil },
    { source: "featured_job", until: featuredJobsMaxUntil },
    { source: "job", until: jobsMaxUntil },
  ];

  // Find the candidate(s) with the maximum date
  let maxUntil: Date | null = null;
  let maxSource: VisibilitySource = "none";

  for (const candidate of candidates) {
    if (!candidate.until) continue;

    if (!maxUntil || candidate.until > maxUntil) {
      maxUntil = candidate.until;
      maxSource = candidate.source;
    } else if (
      candidate.until.getTime() === maxUntil.getTime() &&
      VISIBILITY_PRIORITY[candidate.source] > VISIBILITY_PRIORITY[maxSource]
    ) {
      // Tie-breaker: use higher priority source
      maxSource = candidate.source;
    }
  }

  return {
    maxSource,
    maxUntil,
    subscriptionUntil,
    vendorUntil,
    jobsMaxUntil,
    featuredJobsMaxUntil,
    eligibleJobsCount,
  };
}

/**
 * CANONICAL FUNCTION: Recompute organization visibility
 *
 * This is the single source of truth for computing directory visibility.
 * Call this function whenever engagement changes (job publish, subscription, etc.)
 *
 * Requirements:
 * - Deterministic: same inputs = same outputs
 * - Idempotent: safe to call multiple times
 * - Concurrent-safe: uses atomic updates
 */
export async function recomputeOrganizationVisibility(
  orgId: string,
  opts?: RecomputeOptions
): Promise<RecomputeResult> {
  // Lazy-load firebase-admin to prevent build-time initialization errors
  const { db } = await import("@/lib/firebase-admin");

  if (!db) {
    return {
      orgId,
      success: false,
      isDirectoryVisible: false,
      visibilityReason: "expired",
      directoryVisibleUntil: null,
      sourceDetails: { maxSource: "none", eligibleJobsCount: 0 },
      error: "Firebase Admin not initialized",
    };
  }

  try {
    const now = new Date();
    const orgRef = db.collection("employers").doc(orgId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) {
      return {
        orgId,
        success: false,
        isDirectoryVisible: false,
        visibilityReason: "expired",
        directoryVisibleUntil: null,
        sourceDetails: { maxSource: "none", eligibleJobsCount: 0 },
        error: "Organization not found",
      };
    }

    const orgData = orgDoc.data()!;

    // Step 1: Check approval status - unapproved orgs are never visible
    if (orgData.status !== "approved") {
      const result: RecomputeResult = {
        orgId,
        success: true,
        isDirectoryVisible: false,
        visibilityReason: "expired",
        directoryVisibleUntil: null,
        sourceDetails: { maxSource: "none", eligibleJobsCount: 0 },
      };

      if (!opts?.dryRun) {
        await orgRef.update({
          isDirectoryVisible: false,
          visibilityReason: "expired",
          directoryVisibleUntil: null,
          visibilityComputedAt: FieldValue.serverTimestamp(),
          visibilitySourceDetails: result.sourceDetails,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return result;
    }

    // Step 2: Check if grandfathered - permanent visibility
    if (orgData.isGrandfathered === true) {
      const result: RecomputeResult = {
        orgId,
        success: true,
        isDirectoryVisible: true,
        visibilityReason: "grandfathered",
        directoryVisibleUntil: null, // null = permanent
        sourceDetails: { maxSource: "none", eligibleJobsCount: 0 },
      };

      if (!opts?.dryRun) {
        await orgRef.update({
          isDirectoryVisible: true,
          directoryVisibleUntil: null,
          visibilityReason: "grandfathered",
          visibilityComputedAt: FieldValue.serverTimestamp(),
          visibilitySourceDetails: result.sourceDetails,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return result;
    }

    // Step 3: Gather visibility candidates from various sources

    // 3a: Employer subscription
    let subscriptionUntil: Date | null = null;
    if (
      orgData.subscription?.active === true &&
      orgData.subscription?.expiresAt
    ) {
      const expiresAt = toDate(orgData.subscription.expiresAt);
      if (expiresAt && expiresAt > now) {
        subscriptionUntil = expiresAt;
      }
    }

    // 3b: Vendor subscription
    let vendorUntil: Date | null = null;
    if (
      orgData.vendorSubscription?.active === true &&
      orgData.vendorSubscription?.expiresAt
    ) {
      const expiresAt = toDate(orgData.vendorSubscription.expiresAt);
      if (expiresAt && expiresAt > now) {
        vendorUntil = expiresAt;
      }
    }

    // 3c: Also check vendors collection if this org has an associated vendor
    // Query vendors where ownerUserId matches this org
    try {
      const vendorsSnapshot = await db
        .collection("vendors")
        .where("ownerUserId", "==", orgId)
        .where("subscriptionStatus", "==", "active")
        .get();

      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        if (vendorData.subscriptionEndsAt) {
          const vendorExpiresAt = toDate(vendorData.subscriptionEndsAt);
          if (vendorExpiresAt && vendorExpiresAt > now) {
            if (!vendorUntil || vendorExpiresAt > vendorUntil) {
              vendorUntil = vendorExpiresAt;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[visibility] Error checking vendors for ${orgId}:`, e);
    }

    // 3d: Jobs - query eligible jobs and compute visibility
    let jobsMaxUntil: Date | null = null;
    let featuredJobsMaxUntil: Date | null = null;
    let eligibleJobsCount = 0;

    try {
      // Query jobs for this employer that are:
      // - active
      // - have publishedAt
      // - not deleted/archived (we check active=true)
      const jobsSnapshot = await db
        .collection("jobs")
        .where("employerId", "==", orgId)
        .where("active", "==", true)
        .get();

      for (const jobDoc of jobsSnapshot.docs) {
        const jobData = jobDoc.data();

        // Skip jobs without publishedAt
        const publishedAt = toDate(jobData.publishedAt || jobData.createdAt);
        if (!publishedAt) continue;

        // Calculate visibility until date based on featured status
        const isFeatured = jobData.featured === true;
        const visibilityDays = isFeatured
          ? FEATURED_JOB_VISIBILITY_DAYS
          : STANDARD_JOB_VISIBILITY_DAYS;
        const jobVisibleUntil = addDays(publishedAt, visibilityDays);

        // Only count if visibility is still in the future
        if (jobVisibleUntil > now) {
          eligibleJobsCount++;

          if (isFeatured) {
            if (!featuredJobsMaxUntil || jobVisibleUntil > featuredJobsMaxUntil) {
              featuredJobsMaxUntil = jobVisibleUntil;
            }
          } else {
            if (!jobsMaxUntil || jobVisibleUntil > jobsMaxUntil) {
              jobsMaxUntil = jobVisibleUntil;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[visibility] Error checking jobs for ${orgId}:`, e);
    }

    // Step 4: Compute source details and determine max visibility date
    const sourceDetails = computeSourceDetails(
      subscriptionUntil,
      vendorUntil,
      featuredJobsMaxUntil,
      jobsMaxUntil,
      eligibleJobsCount
    );

    // Step 5: Determine final visibility
    const directoryVisibleUntil: Date | null = sourceDetails.maxUntil ?? null;
    const isDirectoryVisible =
      directoryVisibleUntil !== null && directoryVisibleUntil > now;
    const visibilityReason = determineVisibilityReason(
      isDirectoryVisible,
      sourceDetails
    );

    const result: RecomputeResult = {
      orgId,
      success: true,
      isDirectoryVisible,
      visibilityReason,
      directoryVisibleUntil,
      sourceDetails,
    };

    // Step 6: Write updates to org doc
    if (!opts?.dryRun) {
      const updateData: Record<string, unknown> = {
        isDirectoryVisible,
        visibilityReason,
        visibilityComputedAt: FieldValue.serverTimestamp(),
        visibilitySourceDetails: {
          maxSource: sourceDetails.maxSource,
          maxUntil: sourceDetails.maxUntil
            ? toTimestamp(sourceDetails.maxUntil)
            : null,
          subscriptionUntil: sourceDetails.subscriptionUntil
            ? toTimestamp(sourceDetails.subscriptionUntil)
            : null,
          vendorUntil: sourceDetails.vendorUntil
            ? toTimestamp(sourceDetails.vendorUntil)
            : null,
          jobsMaxUntil: sourceDetails.jobsMaxUntil
            ? toTimestamp(sourceDetails.jobsMaxUntil)
            : null,
          featuredJobsMaxUntil: sourceDetails.featuredJobsMaxUntil
            ? toTimestamp(sourceDetails.featuredJobsMaxUntil)
            : null,
          eligibleJobsCount: sourceDetails.eligibleJobsCount,
        },
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Set directoryVisibleUntil (never null for non-grandfathered)
      if (directoryVisibleUntil) {
        updateData.directoryVisibleUntil = toTimestamp(directoryVisibleUntil);
      } else {
        // For expired orgs, we could either:
        // 1. Set to a past date to indicate expiration
        // 2. Delete the field
        // We'll use FieldValue.delete() to remove it, making queries cleaner
        updateData.directoryVisibleUntil = FieldValue.delete();
      }

      await orgRef.update(updateData);
    }

    console.log(
      `[visibility] Computed for ${orgId}: visible=${isDirectoryVisible}, reason=${visibilityReason}, until=${directoryVisibleUntil?.toISOString() || "none"}`
    );

    return result;
  } catch (error) {
    console.error(`[visibility] Error computing for ${orgId}:`, error);
    return {
      orgId,
      success: false,
      isDirectoryVisible: false,
      visibilityReason: "expired",
      directoryVisibleUntil: null,
      sourceDetails: { maxSource: "none", eligibleJobsCount: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Bulk utility: Recompute visibility for all approved organizations
 *
 * Use this for:
 * - Initial migration/backfill
 * - Repair after bugs
 * - Scheduled reconciliation
 */
export async function recomputeOrganizationVisibilityForAllApprovedOrgs(opts?: {
  batchSize?: number;
  dryRun?: boolean;
  onProgress?: (processed: number, total: number, current: string) => void;
}): Promise<{
  total: number;
  processed: number;
  visible: number;
  hidden: number;
  errors: string[];
}> {
  // Lazy-load firebase-admin
  const { db } = await import("@/lib/firebase-admin");

  if (!db) {
    return {
      total: 0,
      processed: 0,
      visible: 0,
      hidden: 0,
      errors: ["Firebase Admin not initialized"],
    };
  }

  const result = {
    total: 0,
    processed: 0,
    visible: 0,
    hidden: 0,
    errors: [] as string[],
  };

  try {
    // Get all approved organizations
    const orgsSnapshot = await db
      .collection("employers")
      .where("status", "==", "approved")
      .get();

    result.total = orgsSnapshot.size;
    console.log(`[visibility] Starting bulk recompute for ${result.total} approved orgs`);

    for (const orgDoc of orgsSnapshot.docs) {
      try {
        if (opts?.onProgress) {
          opts.onProgress(result.processed, result.total, orgDoc.id);
        }

        const computeResult = await recomputeOrganizationVisibility(orgDoc.id, {
          dryRun: opts?.dryRun,
        });

        result.processed++;

        if (computeResult.success) {
          if (computeResult.isDirectoryVisible) {
            result.visible++;
          } else {
            result.hidden++;
          }
        } else {
          result.errors.push(`${orgDoc.id}: ${computeResult.error}`);
        }
      } catch (error) {
        result.errors.push(
          `${orgDoc.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log(
      `[visibility] Bulk recompute complete: ${result.processed}/${result.total} processed, ${result.visible} visible, ${result.hidden} hidden, ${result.errors.length} errors`
    );

    return result;
  } catch (error) {
    result.errors.push(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

/**
 * Check if an organization is currently visible in the directory
 *
 * Quick check without recomputing - uses cached values
 */
export async function isOrganizationDirectoryVisible(
  orgId: string
): Promise<boolean> {
  const { db } = await import("@/lib/firebase-admin");

  if (!db) return false;

  try {
    const orgDoc = await db.collection("employers").doc(orgId).get();
    if (!orgDoc.exists) return false;

    const data = orgDoc.data()!;

    // Must be approved
    if (data.status !== "approved") return false;

    // Check cached visibility value
    if (data.isDirectoryVisible === true) return true;

    // If grandfathered, always visible
    if (data.isGrandfathered === true) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Expire visibility for all orgs that should no longer be visible
 *
 * Called by the scheduled reconciliation cron job
 */
export async function expireStaleVisibility(): Promise<{
  checked: number;
  expired: number;
  errors: string[];
}> {
  const { db } = await import("@/lib/firebase-admin");

  if (!db) {
    return { checked: 0, expired: 0, errors: ["Firebase Admin not initialized"] };
  }

  const result = { checked: 0, expired: 0, errors: [] as string[] };
  const now = new Date();

  try {
    // Find orgs where:
    // - status == 'approved'
    // - isGrandfathered != true
    // - isDirectoryVisible == true
    // - directoryVisibleUntil != null AND <= now
    const snapshot = await db
      .collection("employers")
      .where("status", "==", "approved")
      .where("isDirectoryVisible", "==", true)
      .get();

    for (const orgDoc of snapshot.docs) {
      result.checked++;
      const data = orgDoc.data();

      // Skip grandfathered orgs
      if (data.isGrandfathered === true) continue;

      // Check if visibility has expired
      const visibleUntil = toDate(data.directoryVisibleUntil);
      if (visibleUntil && visibleUntil <= now) {
        try {
          // Recompute to properly update all fields
          const computeResult = await recomputeOrganizationVisibility(orgDoc.id);
          if (computeResult.success && !computeResult.isDirectoryVisible) {
            result.expired++;
            console.log(`[visibility] Expired visibility for ${orgDoc.id}`);
          }
        } catch (error) {
          result.errors.push(
            `${orgDoc.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    console.log(
      `[visibility] Expiration check complete: ${result.checked} checked, ${result.expired} expired`
    );

    return result;
  } catch (error) {
    result.errors.push(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}
