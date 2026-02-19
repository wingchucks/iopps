/**
 * Job application types for the IOPPS platform.
 */

import type { FirestoreTimestamp } from './common';

// ============================================
// APPLICATION STATUS
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

// ============================================
// APPLICATION STAGE HISTORY
// ============================================

export interface ApplicationStageEntry {
  status: ApplicationStatus;
  timestamp: FirestoreTimestamp | Date;
  changedBy?: string; // User ID who made the change
  note?: string; // Optional note about the transition
}

// ============================================
// APPLICANT NOTES
// ============================================

export interface ApplicantNote {
  id: string;
  content: string;
  createdBy: string; // User ID
  createdByName?: string; // Denormalized display name
  createdAt: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}

// ============================================
// JOB APPLICATION
// ============================================

export interface JobApplication {
  id: string;
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  status: ApplicationStatus;
  resumeUrl?: string;
  coverLetter?: string; // Legacy text field
  note?: string; // Legacy single note

  // Employer Notes (multiple timestamped notes)
  employerNotes?: ApplicantNote[];

  // Stage History (tracks status transitions)
  stageHistory?: ApplicationStageEntry[];

  // Modern Cover Letter Handling
  coverLetterType?: 'text' | 'file';
  coverLetterContent?: string; // If text
  coverLetterUrl?: string;     // If file
  coverLetterPath?: string;    // Storage path for deletion

  // Additional Documents
  portfolioUrls?: string[];
  certificationUrls?: string[];
  additionalDocuments?: {
    name: string;
    url: string;
    type: string;
    path: string;
  }[];

  // Application flow fields
  interestStatement?: string;
  portfolioURL?: string;

  // Employer Rating (1-5 stars)
  rating?: number;

  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;

  // Denormalized fields from Firestore
  jobTitle?: string;
}
