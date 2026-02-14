// Job-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  db,
  jobsCollection,
  savedJobsCollection,
  checkFirebase,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "./shared";
import type { JobPosting, SavedJob, JobVideo } from "@/lib/types";
import { MOCK_JOBS } from "../mockData";
import { toDate } from "./timestamps";

// Check if a job has expired based on closingDate or expiresAt
export function isJobExpired(job: JobPosting): boolean {
  const now = new Date();

  const closingDate = toDate(job.closingDate);
  if (closingDate && closingDate < now) return true;

  const expiresAt = toDate(job.expiresAt);
  if (expiresAt && expiresAt < now) return true;

  return false;
}

type JobInput = Omit<
  JobPosting,
  "id" | "createdAt" | "active" | "employerId"
> & { employerId: string; active?: boolean };

export async function createJobPosting(data: JobInput): Promise<string> {
  const ref = collection(db!, jobsCollection);
  const docRef = doc(ref);

  await setDoc(docRef, {
    ...data,
    id: docRef.id,
    active: data.active ?? true,
    viewsCount: 0,
    applicationsCount: 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Clear the pendingEmployerApproval flag from jobs when an employer is approved.
 * This allows the employer to activate their jobs.
 * Note: Does NOT automatically activate jobs - employer decides when to publish.
 */
export async function clearPendingEmployerApprovalFlag(employerId: string): Promise<number> {
  const firestore = checkFirebase();
  if (!firestore) return 0;

  try {
    const jobsRef = collection(firestore, jobsCollection);
    const q = query(
      jobsRef,
      where("employerId", "==", employerId),
      where("pendingEmployerApproval", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;

    const batch = writeBatch(firestore);
    for (const docSnapshot of snapshot.docs) {
      batch.update(docSnapshot.ref, { pendingEmployerApproval: false });
    }
    await batch.commit();

    return snapshot.size;
  } catch (error) {
    console.error("[clearPendingEmployerApprovalFlag] Error:", error);
    return 0;
  }
}

type JobFilters = {
  employmentType?: string;
  remoteOnly?: boolean;
  indigenousOnly?: boolean;
  activeOnly?: boolean;
  status?: "active" | "paused" | "all";
  pageSize?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
};

export interface PaginatedJobsResult {
  jobs: JobPosting[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listJobPostings(
  filters: JobFilters = {}
): Promise<JobPosting[]> {
  const result = await listJobPostingsPaginated(filters);
  return result.jobs;
}

export async function listJobPostingsPaginated(
  filters: JobFilters = {}
): Promise<PaginatedJobsResult> {
  try {
    const firestore = checkFirebase();
    const pageSize = filters.pageSize || 50; // Default page size

    if (!firestore) {
      let jobs = [...MOCK_JOBS];

      if (filters.activeOnly !== false) {
        jobs = jobs.filter(j => j.active && !isJobExpired(j));
      }
      if (filters.employmentType) {
        jobs = jobs.filter(j => j.employmentType === filters.employmentType);
      }
      if (filters.remoteOnly) {
        jobs = jobs.filter(j => j.remoteFlag);
      }
      if (filters.indigenousOnly) {
        jobs = jobs.filter(j => j.indigenousPreference);
      }

      return { jobs: jobs.slice(0, pageSize), lastDoc: null, hasMore: jobs.length > pageSize };
    }
    const ref = collection(firestore, jobsCollection);
    const constraints = [];
    if (filters.activeOnly !== false) {
      constraints.push(where("active", "==", true));
    }
    if (filters.employmentType) {
      constraints.push(where("employmentType", "==", filters.employmentType));
    }
    if (filters.remoteOnly) {
      constraints.push(where("remoteFlag", "==", true));
    }
    if (filters.indigenousOnly) {
      constraints.push(where("indigenousPreference", "==", true));
    }
    if (filters.status && filters.status !== "all") {
      const value = filters.status === "active";
      constraints.push(where("active", "==", value));
    }
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize + 1)); // Fetch one extra to check if there's more

    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    let jobs = docs.map((docSnapshot) => {
      const data = docSnapshot.data() as JobPosting;
      return {
        ...data,
        id: docSnapshot.id,
      };
    });

    // Client-side filtering for expired jobs (safety net for jobs not yet processed by cron)
    if (filters.activeOnly !== false) {
      jobs = jobs.filter((job) => !isJobExpired(job));
    }

    return { jobs, lastDoc, hasMore };
  } catch {
    return { jobs: [], lastDoc: null, hasMore: false };
  }
}

export async function getJobPosting(jobId: string): Promise<JobPosting | null> {
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_JOBS.find(j => j.id === jobId) || null;
  }
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as JobPosting;
  return {
    ...data,
    id: jobId,
  };
}

/**
 * Duplicate an existing job posting
 * Creates a new inactive copy with "(Copy)" appended to title
 * Resets views, applications, and dates
 */
export async function duplicateJobPosting(
  jobId: string,
  employerId: string
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    // Get the original job
    const originalRef = doc(firestore, jobsCollection, jobId);
    const originalSnap = await getDoc(originalRef);
    
    if (!originalSnap.exists()) {
      console.error("[duplicateJobPosting] Original job not found:", jobId);
      return null;
    }

    const originalData = originalSnap.data() as JobPosting;

    // Verify ownership
    if (originalData.employerId !== employerId) {
      console.error("[duplicateJobPosting] Employer mismatch");
      return null;
    }

    // Create new job with copied data
    const newJobRef = doc(collection(firestore, jobsCollection));
    const newJobData = {
      ...originalData,
      id: newJobRef.id,
      title: `${originalData.title} (Copy)`,
      active: false, // Start as inactive/draft
      viewsCount: 0,
      applicationsCount: 0,
      createdAt: serverTimestamp(),
      publishedAt: null,
      closingDate: null, // Clear deadline - user should set new one
      expiresAt: null,
      scheduledPublishAt: null,
      // Clear payment info - new job needs new payment
      paymentStatus: undefined,
      paymentId: undefined,
      productType: undefined,
      amountPaid: undefined,
      // Clear import fields
      importedFrom: undefined,
      originalUrl: undefined,
      originalApplicationLink: undefined,
    };

    await setDoc(newJobRef, newJobData);
    
    return newJobRef.id;
  } catch (error) {
    console.error("[duplicateJobPosting] Error:", error);
    return null;
  }
}

export async function listEmployerJobs(
  employerId: string
): Promise<JobPosting[]> {
  const ref = collection(db!, jobsCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as JobPosting;
    return {
      ...data,
      id: docSnapshot.id,
    };
  });
}

/**
 * Update job active status (publish/unpublish/archive)
 *
 * IMPORTANT: After calling this, trigger visibility recompute!
 * Use: triggerVisibilityRecompute(employerId) from '@/lib/visibility-client'
 *
 * @returns The employerId of the job for visibility recompute
 */
export async function updateJobStatus(jobId: string, active: boolean): Promise<string | null> {
  const ref = doc(db!, jobsCollection, jobId);

  // Get employerId before updating (for visibility recompute)
  const snap = await getDoc(ref);
  const employerId = snap.exists() ? (snap.data() as JobPosting).employerId : null;

  await updateDoc(ref, {
    active,
    // Set publishedAt when activating (if not already set)
    ...(active && !snap.data()?.publishedAt ? { publishedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });

  return employerId;
}

/**
 * Update job posting fields
 *
 * IMPORTANT: If updating 'active' or 'featured', trigger visibility recompute!
 * Use: triggerVisibilityRecompute(employerId) from '@/lib/visibility-client'
 *
 * @returns The employerId of the job for visibility recompute
 */
export async function updateJobPosting(
  jobId: string,
  data: Partial<Omit<JobPosting, "id" | "createdAt" | "employerId">>
): Promise<string | null> {
  const ref = doc(db!, jobsCollection, jobId);

  // Get employerId (for visibility recompute)
  const snap = await getDoc(ref);
  const employerId = snap.exists() ? (snap.data() as JobPosting).employerId : null;

  // Filter out undefined values - Firestore doesn't accept undefined
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await updateDoc(ref, {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });

  return employerId;
}

export async function incrementJobViews(jobId: string) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    viewsCount: increment(1),
  });
}

/**
 * Delete a job posting
 *
 * IMPORTANT: After calling this, trigger visibility recompute!
 * Use: triggerVisibilityRecompute(employerId) from '@/lib/visibility-client'
 *
 * @returns The employerId of the deleted job for visibility recompute
 */
export async function deleteJobPosting(id: string): Promise<string | null> {
  const ref = doc(db!, jobsCollection, id);

  // Get employerId before deleting (for visibility recompute)
  const snap = await getDoc(ref);
  const employerId = snap.exists() ? (snap.data() as JobPosting).employerId : null;

  await deleteDoc(ref);

  return employerId;
}

// Job-specific Video functions
export async function setJobVideo(
  jobId: string,
  videoData: JobVideo
) {
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job posting not found");

  await updateDoc(ref, {
    jobVideo: videoData,
    updatedAt: serverTimestamp(),
  });
}

export async function removeJobVideo(jobId: string) {
  const ref = doc(db!, jobsCollection, jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job posting not found");

  await updateDoc(ref, {
    jobVideo: null,
    updatedAt: serverTimestamp(),
  });
}

// Saved Jobs
export async function toggleSavedJob(
  memberId: string,
  jobId: string,
  shouldSave: boolean
) {
  const snapshot = await getDocs(
    query(
      collection(db!, savedJobsCollection),
      where("memberId", "==", memberId),
      where("jobId", "==", jobId)
    )
  );

  if (shouldSave) {
    if (snapshot.empty) {
      await addDoc(collection(db!, savedJobsCollection), {
        memberId,
        jobId,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
}

export async function listSavedJobs(
  memberId: string
): Promise<SavedJob[]> {
  const ref = collection(db!, savedJobsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc"),
    limit(100) // Limit saved jobs to prevent large queries
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    return [];
  }

  // Collect all job IDs
  const jobIds = snap.docs.map((docSnap) => (docSnap.data() as SavedJob).jobId);

  // Batch fetch jobs to avoid N+1 queries
  // Firestore 'in' query supports max 30 items, so we batch
  const jobsMap = new Map<string, JobPosting>();
  const batchSize = 30;

  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batchIds = jobIds.slice(i, i + batchSize);
    if (batchIds.length > 0) {
      const jobsRef = collection(db!, jobsCollection);
      const jobsQuery = query(jobsRef, where(documentId(), "in", batchIds));
      const jobsSnap = await getDocs(jobsQuery);
      jobsSnap.docs.forEach((jobDoc) => {
        jobsMap.set(jobDoc.id, { ...jobDoc.data() as JobPosting, id: jobDoc.id });
      });
    }
  }

  // Build results with fetched jobs
  const results: SavedJob[] = snap.docs.map((docSnap) => {
    const data = docSnap.data() as SavedJob;
    return {
      ...data,
      id: docSnap.id,
      job: jobsMap.get(data.jobId) || null,
    };
  });

  return results;
}

export async function listSavedJobIds(memberId: string): Promise<string[]> {
  const ref = collection(db!, savedJobsCollection);
  const q = query(ref, where("memberId", "==", memberId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as SavedJob;
    return data.jobId;
  });
}

export async function isJobSaved(memberId: string, jobId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(
      collection(db!, savedJobsCollection),
      where("memberId", "==", memberId),
      where("jobId", "==", jobId),
      limit(1)
    )
  );
  return !snapshot.empty;
}
export function getSavedJobsQuery(memberId: string) {
  return query(
    collection(db!, savedJobsCollection),
    where("memberId", "==", memberId)
  );
}

// ============================================
// JOB TEMPLATE HELPERS
// (Core template functions are in jobTemplates.ts)
// ============================================

import { createJobTemplate as createTemplate, getJobTemplate } from "./jobTemplates";
import type { JobTemplate } from "@/lib/types";

/**
 * Save an existing job as a template
 * Helper that extracts job data and creates a template
 */
export async function saveJobAsTemplate(
  jobId: string,
  employerId: string,
  templateName: string,
  templateDescription?: string
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  // Get the job
  const job = await getJobPosting(jobId);
  if (!job || job.employerId !== employerId) {
    console.error("[saveJobAsTemplate] Job not found or access denied");
    return null;
  }

  // Create template from job using the core function
  const templateData: Omit<JobTemplate, "id" | "createdAt" | "updatedAt" | "usageCount"> = {
    employerId,
    name: templateName,
    description: templateDescription,
    title: job.title,
    location: job.location,
    employmentType: job.employmentType,
    remoteFlag: job.remoteFlag,
    indigenousPreference: job.indigenousPreference,
    jobDescription: job.description,
    responsibilities: job.responsibilities,
    qualifications: job.qualifications,
    requirements: job.requirements,
    benefits: job.benefits,
    salaryRange: job.salaryRange,
    category: job.category,
    locationType: job.locationType,
    cpicRequired: job.cpicRequired,
    willTrain: job.willTrain,
    driversLicense: job.driversLicense,
    quickApplyEnabled: job.quickApplyEnabled,
  };

  return createTemplate(templateData);
}

/**
 * Create a job from a template
 * Returns the new job ID (job is created as inactive/draft)
 */
export async function createJobFromTemplate(
  templateId: string,
  employerId: string,
  employerName?: string
): Promise<string | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  const template = await getJobTemplate(templateId);
  if (!template || template.employerId !== employerId) {
    console.error("[createJobFromTemplate] Template not found or access denied");
    return null;
  }

  // Create job from template
  const jobData: JobInput = {
    employerId,
    employerName,
    title: template.title || "Untitled Position",
    location: template.location || "",
    employmentType: template.employmentType || "Full-time",
    remoteFlag: template.remoteFlag,
    indigenousPreference: template.indigenousPreference,
    description: template.jobDescription || "",
    responsibilities: template.responsibilities,
    qualifications: template.qualifications,
    requirements: template.requirements,
    benefits: template.benefits,
    salaryRange: template.salaryRange,
    category: template.category,
    locationType: template.locationType,
    cpicRequired: template.cpicRequired,
    willTrain: template.willTrain,
    driversLicense: template.driversLicense,
    quickApplyEnabled: template.quickApplyEnabled,
    active: false, // Start as draft
  };

  return createJobPosting(jobData);
}
