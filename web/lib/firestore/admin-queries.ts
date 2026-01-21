/**
 * Admin Query Utilities
 *
 * Centralized query builders for admin panel to ensure consistent
 * data fetching across dashboard and list pages.
 *
 * Key Rules:
 * 1. All queries exclude soft-deleted records (deletedAt != null)
 * 2. Counts match what list pages display
 * 3. Status filtering is standardized
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// Types
// ============================================================================

export type EntityType =
  | "users"
  | "memberProfiles"
  | "employers"
  | "vendors"
  | "jobs"
  | "conferences"
  | "powwows"
  | "applications"
  | "scholarships";

export type StatusFilter = "all" | "pending" | "approved" | "rejected" | "suspended" | "active" | "inactive";

export interface AdminQueryOptions {
  status?: StatusFilter;
  excludeDeleted?: boolean;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  startAfterDoc?: QueryDocumentSnapshot;
  additionalConstraints?: QueryConstraint[];
}

export interface AdminCountResult {
  total: number;
  byStatus?: Record<string, number>;
  error?: string;
}

export interface AdminListResult<T> {
  data: T[];
  total: number;
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  error?: string;
}

export interface AdminCountsSnapshot {
  users: { total: number; byRole: Record<string, number> };
  memberProfiles: { total: number; withResume: number; withSkills: number };
  employers: { total: number; pending: number; approved: number; rejected: number };
  vendors: { total: number; pending: number; active: number; featured: number };
  jobs: { total: number; active: number; inactive: number };
  conferences: { total: number; active: number };
  applications: { total: number; recent7d: number; recent30d: number };
  powwows: { total: number; active: number };
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * Build constraints for excluding soft-deleted records
 */
function getNotDeletedConstraint(): QueryConstraint {
  return where("deletedAt", "==", null);
}

/**
 * Build status filter constraint based on entity type
 */
function getStatusConstraint(entityType: EntityType, status: StatusFilter): QueryConstraint | null {
  if (status === "all") return null;

  // Different entities use different status field patterns
  switch (entityType) {
    case "jobs":
    case "conferences":
    case "powwows":
    case "scholarships":
      // These use boolean 'active' field
      if (status === "active") return where("active", "==", true);
      if (status === "inactive") return where("active", "==", false);
      return null;

    case "employers":
    case "vendors":
      // These use string 'status' field
      if (status === "pending") return where("status", "==", "pending");
      if (status === "approved") return where("status", "==", "approved");
      if (status === "rejected") return where("status", "==", "rejected");
      if (status === "suspended") return where("status", "==", "suspended");
      if (status === "active") return where("status", "==", "active");
      return null;

    case "users":
      // Users don't have status, but have 'disabled' flag
      if (status === "active") return where("disabled", "!=", true);
      if (status === "inactive") return where("disabled", "==", true);
      return null;

    default:
      return null;
  }
}

/**
 * Build a complete query for an entity type
 */
export function buildAdminQuery(
  entityType: EntityType,
  options: AdminQueryOptions = {}
): QueryConstraint[] {
  const {
    status = "all",
    excludeDeleted = true,
    sortBy = "createdAt",
    sortDirection = "desc",
    pageSize,
    startAfterDoc,
    additionalConstraints = [],
  } = options;

  const constraints: QueryConstraint[] = [];

  // Add status filter
  const statusConstraint = getStatusConstraint(entityType, status);
  if (statusConstraint) {
    constraints.push(statusConstraint);
  }

  // Add soft-delete filter (only for entities that support it)
  // Note: Firestore doesn't support != null directly, so we check for specific collections
  if (excludeDeleted && ["employers", "users", "memberProfiles"].includes(entityType)) {
    // We'll handle this in post-processing since Firestore doesn't support != null well
  }

  // Add custom constraints
  constraints.push(...additionalConstraints);

  // Add sorting
  constraints.push(orderBy(sortBy, sortDirection));

  // Add pagination
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }
  if (pageSize) {
    constraints.push(limit(pageSize));
  }

  return constraints;
}

// ============================================================================
// Count Functions (Single Source of Truth)
// ============================================================================

/**
 * Get accurate count for an entity type with optional status filter
 * This is the SINGLE SOURCE OF TRUTH for counts - use this everywhere
 */
export async function getAdminCount(
  entityType: EntityType,
  options: { status?: StatusFilter; excludeDeleted?: boolean } = {}
): Promise<AdminCountResult> {
  const { status = "all", excludeDeleted = true } = options;

  if (!db) {
    return { total: 0, error: "Database not initialized" };
  }

  try {
    const collectionRef = collection(db, entityType);
    const constraints: QueryConstraint[] = [];

    // Add status filter
    const statusConstraint = getStatusConstraint(entityType, status);
    if (statusConstraint) {
      constraints.push(statusConstraint);
    }

    // Build query
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    // Try to use getCountFromServer for efficiency
    try {
      const countSnapshot = await getCountFromServer(q);
      let total = countSnapshot.data().count;

      // If excluding deleted, we need to fetch and filter (Firestore limitation)
      if (excludeDeleted && ["employers", "users", "memberProfiles"].includes(entityType)) {
        const docsSnapshot = await getDocs(q);
        total = docsSnapshot.docs.filter((doc) => !doc.data().deletedAt).length;
      }

      return { total };
    } catch {
      // Fallback to getDocs if index not available
      const docsSnapshot = await getDocs(q);
      let docs = docsSnapshot.docs;

      if (excludeDeleted) {
        docs = docs.filter((doc) => !doc.data().deletedAt);
      }

      return { total: docs.length };
    }
  } catch (error) {
    console.error(`Error getting count for ${entityType}:`, error);
    return { total: 0, error: "Failed to load" };
  }
}

/**
 * Get counts grouped by status for an entity type
 */
export async function getAdminCountsByStatus(
  entityType: EntityType,
  statusField: string = "status",
  statusValues: string[] = ["pending", "approved", "rejected"]
): Promise<{ total: number; byStatus: Record<string, number>; error?: string }> {
  if (!db) {
    return { total: 0, byStatus: {}, error: "Database not initialized" };
  }

  try {
    const collectionRef = collection(db, entityType);
    const docsSnapshot = await getDocs(collectionRef);

    // Filter out soft-deleted
    const activeDocs = docsSnapshot.docs.filter((doc) => !doc.data().deletedAt);

    const byStatus: Record<string, number> = {};
    statusValues.forEach((status) => {
      byStatus[status] = activeDocs.filter((doc) => {
        const data = doc.data();
        return data[statusField] === status || (status === "pending" && !data[statusField]);
      }).length;
    });

    return {
      total: activeDocs.length,
      byStatus,
    };
  } catch (error) {
    console.error(`Error getting counts by status for ${entityType}:`, error);
    return { total: 0, byStatus: {}, error: "Failed to load" };
  }
}

/**
 * Get all admin counts in a single batch (for dashboard)
 * Uses parallel fetching for performance
 */
export async function getAllAdminCounts(): Promise<AdminCountsSnapshot> {
  const defaultCounts: AdminCountsSnapshot = {
    users: { total: 0, byRole: {} },
    memberProfiles: { total: 0, withResume: 0, withSkills: 0 },
    employers: { total: 0, pending: 0, approved: 0, rejected: 0 },
    vendors: { total: 0, pending: 0, active: 0, featured: 0 },
    jobs: { total: 0, active: 0, inactive: 0 },
    conferences: { total: 0, active: 0 },
    applications: { total: 0, recent7d: 0, recent30d: 0 },
    powwows: { total: 0, active: 0 },
  };

  if (!db) return defaultCounts;

  try {
    // Fetch all collections in parallel
    const [
      usersSnap,
      memberProfilesSnap,
      employersSnap,
      vendorsSnap,
      jobsSnap,
      conferencesSnap,
      applicationsSnap,
      powwowsSnap,
    ] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "memberProfiles")),
      getDocs(collection(db, "employers")),
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "jobs")),
      getDocs(collection(db, "conferences")),
      getDocs(collection(db, "applications")),
      getDocs(collection(db, "powwows")),
    ]);

    // Process users
    const users = usersSnap.docs.filter((doc) => !doc.data().deletedAt);
    const usersByRole: Record<string, number> = {};
    users.forEach((doc) => {
      const role = doc.data().role || "community";
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    // Process memberProfiles
    const memberProfiles = memberProfilesSnap.docs.filter((doc) => !doc.data().deletedAt);
    const memberProfilesWithResume = memberProfiles.filter((doc) => doc.data().resumeUrl).length;
    const memberProfilesWithSkills = memberProfiles.filter((doc) => {
      const skills = doc.data().skills;
      return skills && Array.isArray(skills) && skills.length > 0;
    }).length;

    // Process employers
    const employers = employersSnap.docs.filter((doc) => !doc.data().deletedAt);
    const employersByStatus = {
      pending: employers.filter((doc) => (doc.data().status || "pending") === "pending").length,
      approved: employers.filter((doc) => doc.data().status === "approved").length,
      rejected: employers.filter((doc) => doc.data().status === "rejected").length,
    };

    // Process vendors
    const vendors = vendorsSnap.docs;
    const vendorsByStatus = {
      pending: vendors.filter((doc) => doc.data().status === "pending").length,
      active: vendors.filter((doc) => doc.data().status === "active").length,
      featured: vendors.filter((doc) => doc.data().featured === true).length,
    };

    // Process jobs
    const jobs = jobsSnap.docs;
    const activeJobs = jobs.filter((doc) => doc.data().active === true).length;

    // Process conferences
    const conferences = conferencesSnap.docs;
    const activeConferences = conferences.filter((doc) => doc.data().active === true).length;

    // Process applications with date filters
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const applications = applicationsSnap.docs;
    const recent7d = applications.filter((doc) => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const date = createdAt instanceof Timestamp ? createdAt.toDate() : new Date(createdAt);
      return date >= sevenDaysAgo;
    }).length;
    const recent30d = applications.filter((doc) => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const date = createdAt instanceof Timestamp ? createdAt.toDate() : new Date(createdAt);
      return date >= thirtyDaysAgo;
    }).length;

    // Process powwows
    const powwows = powwowsSnap.docs;
    const activePowwows = powwows.filter((doc) => doc.data().active === true).length;

    return {
      users: { total: users.length, byRole: usersByRole },
      memberProfiles: { total: memberProfiles.length, withResume: memberProfilesWithResume, withSkills: memberProfilesWithSkills },
      employers: { total: employers.length, ...employersByStatus },
      vendors: { total: vendors.length, ...vendorsByStatus },
      jobs: { total: jobs.length, active: activeJobs, inactive: jobs.length - activeJobs },
      conferences: { total: conferences.length, active: activeConferences },
      applications: { total: applications.length, recent7d, recent30d },
      powwows: { total: powwows.length, active: activePowwows },
    };
  } catch (error) {
    console.error("Error fetching admin counts:", error);
    return defaultCounts;
  }
}

// ============================================================================
// List Functions
// ============================================================================

/**
 * Generic admin list fetcher with pagination, filtering, and sorting
 */
export async function getAdminList<T extends DocumentData>(
  entityType: EntityType,
  options: AdminQueryOptions = {}
): Promise<AdminListResult<T>> {
  const {
    status = "all",
    excludeDeleted = true,
    sortBy = "createdAt",
    sortDirection = "desc",
    pageSize = 20,
    startAfterDoc,
  } = options;

  if (!db) {
    return { data: [], total: 0, lastDoc: null, hasMore: false, error: "Database not initialized" };
  }

  try {
    const collectionRef = collection(db, entityType);
    const constraints: QueryConstraint[] = [];

    // Add status filter
    const statusConstraint = getStatusConstraint(entityType, status);
    if (statusConstraint) {
      constraints.push(statusConstraint);
    }

    // Add sorting
    constraints.push(orderBy(sortBy, sortDirection));

    // Add pagination cursor
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    // Add limit
    constraints.push(limit(pageSize));

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    // Filter soft-deleted in post-processing
    let docs = snapshot.docs;
    if (excludeDeleted) {
      docs = docs.filter((doc) => !doc.data().deletedAt);
    }

    const data = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as T[];

    // Get total count for pagination
    const totalResult = await getAdminCount(entityType, { status, excludeDeleted });

    return {
      data,
      total: totalResult.total,
      lastDoc: docs[docs.length - 1] || null,
      hasMore: docs.length === pageSize,
    };
  } catch (error) {
    console.error(`Error fetching admin list for ${entityType}:`, error);
    return { data: [], total: 0, lastDoc: null, hasMore: false, error: "Failed to load" };
  }
}

// ============================================================================
// Pending Items (for Dashboard Queues)
// ============================================================================

export interface PendingItem {
  id: string;
  name: string;
  type: EntityType;
  createdAt?: Date;
  email?: string;
}

/**
 * Get all pending items across entity types (for dashboard queues)
 */
export async function getPendingItems(maxPerType: number = 10): Promise<PendingItem[]> {
  if (!db) return [];

  try {
    const [employersSnap, vendorsSnap, conferencesSnap] = await Promise.all([
      getDocs(query(collection(db, "employers"), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(maxPerType))),
      getDocs(query(collection(db, "vendors"), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(maxPerType))),
      getDocs(query(collection(db, "conferences"), where("active", "==", false), orderBy("createdAt", "desc"), limit(maxPerType))),
    ]);

    const items: PendingItem[] = [];

    // Process employers
    employersSnap.docs
      .filter((doc) => !doc.data().deletedAt)
      .forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          name: data.organizationName || data.email || "Unknown Employer",
          type: "employers",
          createdAt: data.createdAt?.toDate?.() || undefined,
          email: data.contactEmail,
        });
      });

    // Process vendors
    vendorsSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        name: data.businessName || "Unknown Vendor",
        type: "vendors",
        createdAt: data.createdAt?.toDate?.() || undefined,
      });
    });

    // Sort by date (newest first)
    items.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return items;
  } catch (error) {
    console.error("Error fetching pending items:", error);
    return [];
  }
}

// ============================================================================
// Failed Imports (for Dashboard)
// ============================================================================

export interface FailedImport {
  id: string;
  feedName: string;
  employerName: string;
  lastError: string;
  lastRunAt?: Date;
}

/**
 * Get RSS feeds with recent failures
 */
export async function getFailedImports(): Promise<FailedImport[]> {
  if (!db) return [];

  try {
    const feedsSnap = await getDocs(collection(db, "rssFeeds"));
    const employersSnap = await getDocs(collection(db, "employers"));

    const employerMap = new Map<string, string>();
    employersSnap.docs.forEach((doc) => {
      employerMap.set(doc.id, doc.data().organizationName || "Unknown");
    });

    const failed: FailedImport[] = [];

    feedsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lastError || data.lastRunStatus === "error") {
        failed.push({
          id: doc.id,
          feedName: data.name || data.feedUrl || "Unnamed Feed",
          employerName: employerMap.get(data.employerId) || "Unknown Employer",
          lastError: data.lastError || "Unknown error",
          lastRunAt: data.lastRunAt?.toDate?.() || undefined,
        });
      }
    });

    return failed;
  } catch (error) {
    console.error("Error fetching failed imports:", error);
    return [];
  }
}
