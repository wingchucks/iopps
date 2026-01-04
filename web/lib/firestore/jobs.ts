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
  db,
  jobsCollection,
  savedJobsCollection,
  checkFirebase,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "./shared";
import type { JobPosting, SavedJob, JobVideo } from "@/lib/types";
import { MOCK_JOBS } from "../mockData";

// Helper to convert various timestamp formats to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

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

export async function updateJobStatus(jobId: string, active: boolean) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateJobPosting(
  jobId: string,
  data: Partial<Omit<JobPosting, "id" | "createdAt" | "employerId">>
) {
  const ref = doc(db!, jobsCollection, jobId);

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
}

export async function incrementJobViews(jobId: string) {
  const ref = doc(db!, jobsCollection, jobId);
  await updateDoc(ref, {
    viewsCount: increment(1),
  });
}

export async function deleteJobPosting(id: string) {
  const ref = doc(db!, jobsCollection, id);
  await deleteDoc(ref);
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
