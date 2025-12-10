// Job-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  db,
  jobsCollection,
  savedJobsCollection,
  checkFirebase,
} from "./shared";
import type { JobPosting, SavedJob, JobVideo } from "@/lib/types";
import { MOCK_JOBS } from "../mockData";

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
};

export async function listJobPostings(
  filters: JobFilters = {}
): Promise<JobPosting[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      let jobs = [...MOCK_JOBS];

      if (filters.activeOnly !== false) {
        jobs = jobs.filter(j => j.active);
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

      return jobs;
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
    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as JobPosting;
      return {
        ...data,
        id: docSnapshot.id,
      };
    });
  } catch {
    return [];
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
  await updateDoc(ref, {
    ...data,
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
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  const results: SavedJob[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as SavedJob;
    const job = await getJobPosting(data.jobId);
    results.push({
      ...data,
      id: docSnap.id,
      job,
    });
  }
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
