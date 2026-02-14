/**
 * Saved Jobs Firestore operations (server-side, firebase-admin).
 *
 * Collection: "savedJobs"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAMES
// ============================================

const SAVED_JOBS_COLLECTION = "savedJobs";
const JOBS_COLLECTION = "jobs";

// ============================================
// TYPES
// ============================================

export interface SavedJob {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  /** Populated when fetched via getSavedJobs */
  job?: Record<string, unknown> | null;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get all saved jobs for a user, with the related job data attached.
 * Queries the "savedJobs" collection by memberId and batch-fetches
 * the corresponding documents from the "jobs" collection.
 *
 * @param uid - The member's Firebase UID
 * @returns Array of saved job records with job data
 */
export async function getSavedJobs(uid: string): Promise<SavedJob[]> {
  if (!adminDb) return [];

  try {
    const snap = await adminDb
      .collection(SAVED_JOBS_COLLECTION)
      .where("memberId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    if (snap.empty) return [];

    // Collect job IDs
    const jobIds = snap.docs.map(
      (doc) => (doc.data() as SavedJob).jobId
    );

    // Batch fetch jobs (Firestore "in" supports max 30 items)
    const jobsMap = new Map<string, Record<string, unknown>>();
    const batchSize = 30;

    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batchIds = jobIds.slice(i, i + batchSize);
      if (batchIds.length > 0) {
        const jobsSnap = await adminDb
          .collection(JOBS_COLLECTION)
          .where("__name__", "in", batchIds)
          .get();

        jobsSnap.docs.forEach((jobDoc) => {
          jobsMap.set(jobDoc.id, {
            ...jobDoc.data(),
            id: jobDoc.id,
          });
        });
      }
    }

    // Build results with fetched jobs
    return snap.docs.map((doc) => {
      const data = doc.data() as SavedJob;
      return {
        ...data,
        id: doc.id,
        job: jobsMap.get(data.jobId) || null,
      };
    });
  } catch (error) {
    console.error("[getSavedJobs] Error:", error);
    return [];
  }
}

/**
 * Save a job for a user. Creates a document in the "savedJobs" collection.
 * Prevents duplicate saves by checking for an existing record first.
 *
 * @param uid - The member's Firebase UID
 * @param jobId - The job posting ID to save
 */
export async function saveJob(uid: string, jobId: string): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  // Check if already saved
  const existing = await adminDb
    .collection(SAVED_JOBS_COLLECTION)
    .where("memberId", "==", uid)
    .where("jobId", "==", jobId)
    .limit(1)
    .get();

  if (!existing.empty) return; // Already saved

  await adminDb.collection(SAVED_JOBS_COLLECTION).add({
    memberId: uid,
    jobId,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Remove a saved job for a user.
 * Deletes matching documents from the "savedJobs" collection.
 *
 * @param uid - The member's Firebase UID
 * @param jobId - The job posting ID to unsave
 */
export async function unsaveJob(uid: string, jobId: string): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const snap = await adminDb
    .collection(SAVED_JOBS_COLLECTION)
    .where("memberId", "==", uid)
    .where("jobId", "==", jobId)
    .get();

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/**
 * Check if a specific job is saved by a user.
 * Queries the "savedJobs" collection.
 *
 * @param uid - The member's Firebase UID
 * @param jobId - The job posting ID to check
 * @returns true if the job is saved, false otherwise
 */
export async function isJobSaved(
  uid: string,
  jobId: string
): Promise<boolean> {
  if (!adminDb) return false;

  try {
    const snap = await adminDb
      .collection(SAVED_JOBS_COLLECTION)
      .where("memberId", "==", uid)
      .where("jobId", "==", jobId)
      .limit(1)
      .get();

    return !snap.empty;
  } catch (error) {
    console.error("[isJobSaved] Error:", error);
    return false;
  }
}
