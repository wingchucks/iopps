/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as limitQuery,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  JobPosting,
  JobApplication,
  EmployerProfile,
  MemberProfile,
} from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface JobStats {
  total: number;
  active: number;
  expired: number;
  thisWeek: number;
  thisMonth: number;
  featured: number;
}

export interface UserStats {
  total: number;
  members: number;
  employers: number;
  newThisWeek: number;
  newThisMonth: number;
}

export interface ApplicationStats {
  total: number;
  submitted: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  hired: number;
  withdrawn: number;
  thisWeek: number;
  thisMonth: number;
}

export interface TopEmployer {
  id: string;
  name: string;
  jobCount: number;
  applicationCount: number;
  activeJobs: number;
}

export interface JobsByCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label: string;
}

export interface RecentActivity {
  id: string;
  type: "job_posted" | "application" | "employer_approved" | "user_registered";
  title: string;
  description: string;
  timestamp: Timestamp | null;
  link?: string;
}

export type DateRange = "7d" | "30d" | "90d" | "1y" | "all";

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRangeTimestamp(range: DateRange): Timestamp | null {
  if (range === "all") return null;

  const now = new Date();
  const days = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  }[range];

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(startDate);
}

function isWithinRange(
  timestamp: Timestamp | null | undefined,
  days: number
): boolean {
  if (!timestamp) return false;
  const now = Date.now();
  const timestampMs = timestamp.seconds * 1000;
  const daysAgo = now - days * 24 * 60 * 60 * 1000;
  return timestampMs >= daysAgo;
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Get job statistics
 */
export async function getJobStats(range: DateRange = "all"): Promise<JobStats> {
  try {
    if (!db) throw new Error("Database not initialized");

    const jobsRef = collection(db, "jobs");
    const snapshot = await getDocs(jobsRef);
    const jobs = snapshot.docs.map((doc) => doc.data() as JobPosting);

    const now = new Date();
    const stats: JobStats = {
      total: jobs.length,
      active: jobs.filter((j) => j.active === true).length,
      expired: jobs.filter((j) => {
        if (!j.expiresAt) return false;
        let expDate: Date;
        if (j.expiresAt instanceof Timestamp) {
          expDate = j.expiresAt.toDate();
        } else if (typeof j.expiresAt === "string") {
          expDate = new Date(j.expiresAt);
        } else if (j.expiresAt instanceof Date) {
          expDate = j.expiresAt;
        } else {
          return false;
        }
        return expDate < now;
      }).length,
      thisWeek: jobs.filter((j) => isWithinRange(j.createdAt as Timestamp, 7))
        .length,
      thisMonth: jobs.filter((j) => isWithinRange(j.createdAt as Timestamp, 30))
        .length,
      featured: jobs.filter((j) => j.paymentStatus === "paid").length,
    };

    return stats;
  } catch (error) {
    console.error("Error getting job stats:", error);
    return {
      total: 0,
      active: 0,
      expired: 0,
      thisWeek: 0,
      thisMonth: 0,
      featured: 0,
    };
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(
  range: DateRange = "all"
): Promise<UserStats> {
  try {
    if (!db) throw new Error("Database not initialized");

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const allUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Filter out soft-deleted users
    const users = allUsers.filter((u) => !u.deletedAt);

    const stats: UserStats = {
      total: users.length,
      members: users.filter((u) => u.role === "community").length,
      employers: users.filter((u) => u.role === "employer").length,
      newThisWeek: users.filter((u) => isWithinRange(u.createdAt, 7)).length,
      newThisMonth: users.filter((u) => isWithinRange(u.createdAt, 30)).length,
    };

    return stats;
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      total: 0,
      members: 0,
      employers: 0,
      newThisWeek: 0,
      newThisMonth: 0,
    };
  }
}

/**
 * Get application statistics
 */
export async function getApplicationStats(
  range: DateRange = "all"
): Promise<ApplicationStats> {
  try {
    if (!db) throw new Error("Database not initialized");

    const applicationsRef = collection(db, "applications");
    const snapshot = await getDocs(applicationsRef);
    const applications = snapshot.docs.map(
      (doc) => doc.data() as JobApplication
    );

    const stats: ApplicationStats = {
      total: applications.length,
      submitted: applications.filter((a) => a.status === "submitted").length,
      reviewed: applications.filter((a) => a.status === "reviewed").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted")
        .length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      hired: applications.filter((a) => a.status === "hired").length,
      withdrawn: applications.filter((a) => a.status === "withdrawn").length,
      thisWeek: applications.filter((a) =>
        isWithinRange(a.createdAt as Timestamp, 7)
      ).length,
      thisMonth: applications.filter((a) =>
        isWithinRange(a.createdAt as Timestamp, 30)
      ).length,
    };

    return stats;
  } catch (error) {
    console.error("Error getting application stats:", error);
    return {
      total: 0,
      submitted: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
      withdrawn: 0,
      thisWeek: 0,
      thisMonth: 0,
    };
  }
}

/**
 * Get top employers by activity
 */
export async function getTopEmployers(
  limit: number = 10
): Promise<TopEmployer[]> {
  try {
    if (!db) throw new Error("Database not initialized");

    // Get all jobs
    const jobsRef = collection(db, "jobs");
    const jobsSnapshot = await getDocs(jobsRef);
    const jobs = jobsSnapshot.docs.map((doc) => doc.data() as JobPosting);

    // Get all applications
    const applicationsRef = collection(db, "applications");
    const applicationsSnapshot = await getDocs(applicationsRef);
    const applications = applicationsSnapshot.docs.map(
      (doc) => doc.data() as JobApplication
    );

    // Aggregate by employer
    const employerMap = new Map<
      string,
      {
        name: string;
        jobCount: number;
        applicationCount: number;
        activeJobs: number;
      }
    >();

    jobs.forEach((job) => {
      const employerId = job.employerId;
      const employerName = job.employerName || "Unknown Employer";

      if (!employerMap.has(employerId)) {
        employerMap.set(employerId, {
          name: employerName,
          jobCount: 0,
          applicationCount: 0,
          activeJobs: 0,
        });
      }

      const employer = employerMap.get(employerId)!;
      employer.jobCount++;
      if (job.active) employer.activeJobs++;
    });

    applications.forEach((app) => {
      const employerId = app.employerId;
      if (employerMap.has(employerId)) {
        employerMap.get(employerId)!.applicationCount++;
      }
    });

    // Convert to array and sort
    const topEmployers: TopEmployer[] = Array.from(employerMap.entries())
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, limit);

    return topEmployers;
  } catch (error) {
    console.error("Error getting top employers:", error);
    return [];
  }
}

/**
 * Get jobs by category/employment type
 */
export async function getJobsByCategory(): Promise<JobsByCategory[]> {
  try {
    if (!db) throw new Error("Database not initialized");

    const jobsRef = collection(db, "jobs");
    const snapshot = await getDocs(jobsRef);
    const jobs = snapshot.docs.map((doc) => doc.data() as JobPosting);

    const categoryMap = new Map<string, number>();
    jobs.forEach((job) => {
      const category = job.employmentType || "Unspecified";
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const total = jobs.length;
    const categories: JobsByCategory[] = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return categories;
  } catch (error) {
    console.error("Error getting jobs by category:", error);
    return [];
  }
}

/**
 * Get time series data for charts
 */
export async function getTimeSeriesData(
  metric: "jobs" | "applications" | "users",
  range: DateRange = "30d"
): Promise<TimeSeriesDataPoint[]> {
  try {
    if (!db) throw new Error("Database not initialized");

    let collectionName: string;
    switch (metric) {
      case "jobs":
        collectionName = "jobs";
        break;
      case "applications":
        collectionName = "applications";
        break;
      case "users":
        collectionName = "users";
        break;
    }

    const ref = collection(db, collectionName);
    const snapshot = await getDocs(ref);
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Determine date range
    const now = new Date();
    const days =
      range === "all"
        ? 365
        : { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[range];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Group by date
    const dateMap = new Map<string, number>();

    (items as Array<Record<string, unknown>>).forEach((item) => {
      const timestamp = item.createdAt as { seconds?: number } | string | undefined;
      if (!timestamp) return;

      let date: Date;
      if (typeof timestamp === "object" && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else {
        return;
      }

      if (date < startDate) return;

      const dateKey = date.toISOString().split("T")[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    // Fill in missing dates with 0
    const dataPoints: TimeSeriesDataPoint[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      const value = dateMap.get(dateKey) || 0;

      dataPoints.unshift({
        date: dateKey,
        value,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    return dataPoints;
  } catch (error) {
    console.error("Error getting time series data:", error);
    return [];
  }
}

/**
 * Get recent activity across the platform
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    if (!db) throw new Error("Database not initialized");

    const activities: RecentActivity[] = [];

    // Get recent jobs
    const jobsRef = collection(db, "jobs");
    const jobsQuery = query(
      jobsRef,
      orderBy("createdAt", "desc"),
      limitQuery(5)
    );
    const jobsSnapshot = await getDocs(jobsQuery);
    jobsSnapshot.docs.forEach((doc) => {
      const job = doc.data() as JobPosting;
      activities.push({
        id: doc.id,
        type: "job_posted",
        title: "New Job Posted",
        description: `${job.employerName || "An employer"} posted "${job.title}"`,
        timestamp: job.createdAt as Timestamp,
        link: `/jobs/${doc.id}`,
      });
    });

    // Get recent applications
    const applicationsRef = collection(db, "applications");
    const applicationsQuery = query(
      applicationsRef,
      orderBy("createdAt", "desc"),
      limitQuery(5)
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    applicationsSnapshot.docs.forEach((doc) => {
      const app = doc.data() as JobApplication;
      activities.push({
        id: doc.id,
        type: "application",
        title: "New Application",
        description: `${app.memberDisplayName || "A member"} applied to a job`,
        timestamp: app.createdAt as Timestamp,
        link: `/admin/applications`,
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    return activities.slice(0, limit);
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
}
