/**
 * Job-related Firestore operations (server-side, firebase-admin).
 *
 * Collection: "jobs"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const JOBS_COLLECTION = "jobs";

// ============================================
// TYPES
// ============================================

/**
 * A flexible timestamp type covering Firestore Timestamps,
 * serialized timestamps, Date objects, and ISO strings.
 */
type TimestampLike =
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date }
  | Date
  | string;

/** Mirrors the v1 JobPosting interface with relevant fields. */
export interface JobPosting {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  location: string;
  employmentType: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  requirements?: string;
  benefits?: string;
  salaryRange?:
    | {
        min?: number;
        max?: number;
        currency?: string;
        period?: string;
        disclosed?: boolean;
      }
    | string;
  applicationLink?: string;
  applicationEmail?: string;
  createdAt?: Timestamp | null;
  closingDate?: Timestamp | string | null;
  active: boolean;
  viewsCount?: number;
  applicationsCount?: number;
  quickApplyEnabled?: boolean;
  companyLogoUrl?: string;
  cpicRequired?: boolean;
  willTrain?: boolean;
  driversLicense?: boolean;
  jobVideo?: {
    videoUrl: string;
    videoProvider?: "youtube" | "vimeo" | "custom";
    videoId?: string;
    title?: string;
    description?: string;
    isIOPPSInterview?: boolean;
  };
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  scheduledPublishAt?: Timestamp | Date | string | null;
  publishedAt?: Timestamp | Date | null;
  importedFrom?: string;
  originalUrl?: string;
  originalApplicationLink?: string;
  noIndex?: boolean;
  category?: string;
  locationType?: "onsite" | "remote" | "hybrid";
  applicationMethod?: "email" | "url" | "quickApply";
  featured?: boolean;
  companyName?: string;
  pendingEmployerApproval?: boolean;
  updatedAt?: Timestamp | null;
}

export interface JobFilters {
  /** Filter by employment type (e.g. "Full-time", "Part-time") */
  employmentType?: string;
  /** Only remote jobs */
  remoteOnly?: boolean;
  /** Only jobs with indigenousPreference */
  indigenousOnly?: boolean;
  /** Whether to only return active jobs. Defaults to true. */
  activeOnly?: boolean;
  /** Filter by active/paused status */
  status?: "active" | "paused" | "all";
  /** Filter by job category */
  category?: string;
  /** Filter by location (client-side substring match) */
  location?: string;
  /** Search term (client-side match against title/description) */
  search?: string;
  /** Page size for pagination */
  pageSize?: number;
  /** Firestore document ID to start after (for cursor pagination) */
  startAfterId?: string;
}

export interface PaginatedJobsResult {
  jobs: JobPosting[];
  lastDocId: string | null;
  hasMore: boolean;
}

type JobCreateInput = Omit<
  JobPosting,
  "id" | "createdAt" | "active" | "viewsCount" | "applicationsCount"
> & { active?: boolean };

// ============================================
// HELPERS
// ============================================

/** Convert a Firestore Timestamp-like value to a plain Date. */
function toDate(value: TimestampLike | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

/** Check if a job has expired based on closingDate or expiresAt. */
function isJobExpired(job: JobPosting): boolean {
  const now = new Date();
  const closingDate = toDate(job.closingDate as TimestampLike | null);
  if (closingDate && closingDate < now) return true;
  const expiresAt = toDate(job.expiresAt as TimestampLike | null);
  if (expiresAt && expiresAt < now) return true;
  return false;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Query jobs with optional filters and cursor-based pagination.
 * Queries the "jobs" collection.
 *
 * @param filters - Optional filter criteria and pagination params
 * @returns Paginated result with jobs array, last document ID, and hasMore flag
 */
export async function getJobs(
  filters: JobFilters = {}
): Promise<PaginatedJobsResult> {
  if (!adminDb) {
    return { jobs: [], lastDocId: null, hasMore: false };
  }

  try {
    const pageSize = filters.pageSize || 50;
    let ref: FirebaseFirestore.Query = adminDb.collection(JOBS_COLLECTION);

    // Active-only filter (default: true)
    if (filters.activeOnly !== false) {
      ref = ref.where("active", "==", true);
    }

    if (filters.status && filters.status !== "all") {
      const value = filters.status === "active";
      ref = ref.where("active", "==", value);
    }

    if (filters.employmentType) {
      ref = ref.where("employmentType", "==", filters.employmentType);
    }

    if (filters.remoteOnly) {
      ref = ref.where("remoteFlag", "==", true);
    }

    if (filters.indigenousOnly) {
      ref = ref.where("indigenousPreference", "==", true);
    }

    if (filters.category) {
      ref = ref.where("category", "==", filters.category);
    }

    ref = ref.orderBy("createdAt", "desc");

    // Cursor pagination
    if (filters.startAfterId) {
      const startAfterDoc = await adminDb
        .collection(JOBS_COLLECTION)
        .doc(filters.startAfterId)
        .get();
      if (startAfterDoc.exists) {
        ref = ref.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to detect hasMore
    ref = ref.limit(pageSize + 1);

    const snap = await ref.get();
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;

    let jobs: JobPosting[] = docs.map((doc) => ({
      ...(doc.data() as JobPosting),
      id: doc.id,
    }));

    // Client-side filtering for expired jobs (safety net)
    if (filters.activeOnly !== false) {
      jobs = jobs.filter((job) => !isJobExpired(job));
    }

    // Client-side search filter (Firestore doesn't support full-text search)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower)
      );
    }

    // Client-side location filter
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      jobs = jobs.filter((job) =>
        job.location?.toLowerCase().includes(locationLower)
      );
    }

    return { jobs, lastDocId, hasMore };
  } catch (error) {
    console.error("[getJobs] Error:", error);
    return { jobs: [], lastDocId: null, hasMore: false };
  }
}

/**
 * Get a single job posting by its document ID.
 * Queries the "jobs" collection.
 *
 * @param id - Firestore document ID
 * @returns The job posting or null if not found
 */
export async function getJobById(id: string): Promise<JobPosting | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb.collection(JOBS_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return { ...(snap.data() as JobPosting), id: snap.id };
  } catch (error) {
    console.error("[getJobById] Error:", error);
    return null;
  }
}

/**
 * Create a new job posting document in the "jobs" collection.
 *
 * @param data - Job posting data (employerId required)
 * @returns The new document ID
 */
export async function createJob(data: JobCreateInput): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const ref = adminDb.collection(JOBS_COLLECTION).doc();
  await ref.set({
    ...data,
    id: ref.id,
    active: data.active ?? true,
    viewsCount: 0,
    applicationsCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

/**
 * Update fields on an existing job posting in the "jobs" collection.
 *
 * @param id - Document ID of the job to update
 * @param data - Partial fields to update
 */
export async function updateJob(
  id: string,
  data: Partial<Omit<JobPosting, "id" | "createdAt">>
): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  // Filter out undefined values -- Firestore rejects them
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await adminDb
    .collection(JOBS_COLLECTION)
    .doc(id)
    .update({
      ...cleanData,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Delete a job posting document from the "jobs" collection.
 *
 * @param id - Document ID of the job to delete
 */
export async function deleteJob(id: string): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  await adminDb.collection(JOBS_COLLECTION).doc(id).delete();
}

/**
 * Get all jobs posted by a specific employer.
 * Queries the "jobs" collection by employerId field.
 *
 * @param employerId - The employer's user ID
 * @returns Array of job postings
 */
export async function getJobsByEmployer(
  employerId: string
): Promise<JobPosting[]> {
  if (!adminDb) return [];

  try {
    const snap = await adminDb
      .collection(JOBS_COLLECTION)
      .where("employerId", "==", employerId)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as JobPosting),
      id: doc.id,
    }));
  } catch (error) {
    console.error("[getJobsByEmployer] Error:", error);
    return [];
  }
}

/**
 * Search jobs by matching a query string against title and description.
 * Fetches active jobs and filters client-side (Firestore has no full-text search).
 * Queries the "jobs" collection.
 *
 * @param queryStr - Search term
 * @param filters - Optional additional filters
 * @returns Matching job postings
 */
export async function searchJobs(
  queryStr: string,
  filters: Omit<JobFilters, "search"> = {}
): Promise<JobPosting[]> {
  const result = await getJobs({
    ...filters,
    search: queryStr,
    activeOnly: filters.activeOnly ?? true,
  });
  return result.jobs;
}
