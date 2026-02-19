/**
 * Job application Firestore operations (server-side, firebase-admin).
 *
 * Collection: "applications"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const APPLICATIONS_COLLECTION = "applications";
const JOBS_COLLECTION = "jobs";

// ============================================
// TYPES
// ============================================

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "hired"
  | "withdrawn";

export interface ApplicationStageEntry {
  status: ApplicationStatus;
  timestamp: Timestamp | Date;
  changedBy?: string;
  note?: string;
}

export interface ApplicantNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface JobApplication {
  id: string;
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  status: ApplicationStatus;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
  employerNotes?: ApplicantNote[];
  stageHistory?: ApplicationStageEntry[];
  coverLetterType?: "text" | "file";
  coverLetterContent?: string;
  coverLetterUrl?: string;
  coverLetterPath?: string;
  portfolioUrls?: string[];
  certificationUrls?: string[];
  additionalDocuments?: {
    name: string;
    url: string;
    type: string;
    path: string;
  }[];
  rating?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  jobTitle?: string;
}

type ApplicationCreateInput = {
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
  coverLetterType?: "text" | "file";
  coverLetterContent?: string;
  coverLetterUrl?: string;
  coverLetterPath?: string;
  portfolioUrls?: string[];
  certificationUrls?: string[];
  additionalDocuments?: {
    name: string;
    url: string;
    type: string;
    path: string;
  }[];
};

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get all applications for a specific job.
 * Queries the "applications" collection by jobId.
 *
 * @param jobId - The job posting ID
 * @returns Array of job applications, ordered by createdAt desc
 */
export async function getApplicationsByJob(
  jobId: string
): Promise<JobApplication[]> {
  if (!adminDb) return [];

  try {
    const snap = await adminDb
      .collection(APPLICATIONS_COLLECTION)
      .where("jobId", "==", jobId)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as JobApplication),
      id: doc.id,
    }));
  } catch (error) {
    console.error("[getApplicationsByJob] Error:", error);
    return [];
  }
}

/**
 * Get all applications submitted by a specific member.
 * Queries the "applications" collection by memberId.
 *
 * @param uid - The member's Firebase UID
 * @returns Array of job applications, ordered by createdAt desc
 */
export async function getApplicationsByMember(
  uid: string
): Promise<JobApplication[]> {
  if (!adminDb) return [];

  try {
    const snap = await adminDb
      .collection(APPLICATIONS_COLLECTION)
      .where("memberId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as JobApplication),
      id: doc.id,
    }));
  } catch (error) {
    console.error("[getApplicationsByMember] Error:", error);
    return [];
  }
}

/**
 * Get a single application by its document ID.
 * Queries the "applications" collection.
 *
 * @param id - Application document ID
 * @returns The application or null if not found
 */
export async function getApplicationById(
  id: string
): Promise<JobApplication | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(APPLICATIONS_COLLECTION)
      .doc(id)
      .get();

    if (!snap.exists) return null;
    return { ...(snap.data() as JobApplication), id: snap.id };
  } catch (error) {
    console.error("[getApplicationById] Error:", error);
    return null;
  }
}

/**
 * Create a new job application document.
 * Also increments the applicationsCount on the related job document.
 * Writes to the "applications" collection.
 *
 * @param data - Application data
 * @returns The new application document ID
 */
export async function createApplication(
  data: ApplicationCreateInput
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const ref = await adminDb.collection(APPLICATIONS_COLLECTION).add({
    ...data,
    status: "submitted" as ApplicationStatus,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Increment the application count on the job
  try {
    await adminDb
      .collection(JOBS_COLLECTION)
      .doc(data.jobId)
      .update({
        applicationsCount: FieldValue.increment(1),
      });
  } catch (error) {
    console.error("[createApplication] Failed to increment job applications count:", error);
  }

  return ref.id;
}

/**
 * Update the status of a job application.
 * Queries the "applications" collection.
 *
 * Valid statuses: submitted, reviewed, shortlisted, interviewing, offered, rejected, hired, withdrawn
 *
 * @param id - Application document ID
 * @param status - New application status
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const stageEntry: ApplicationStageEntry = {
    status,
    timestamp: new Date(),
  };

  await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .doc(id)
    .update({
      status,
      stageHistory: FieldValue.arrayUnion(stageEntry),
      updatedAt: FieldValue.serverTimestamp(),
    });
}
