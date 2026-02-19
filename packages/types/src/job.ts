/**
 * Job-related types for the IOPPS platform.
 */

import type { FirestoreTimestamp, TimestampLike } from './common';
import type { TRCAlignment } from './organization';

// ============================================
// JOB CATEGORIES & ENUMS
// ============================================

export const JOB_CATEGORIES = [
  "Technology",
  "Healthcare",
  "Education",
  "Construction",
  "Finance",
  "Government",
  "Non-Profit",
  "Trades",
  "Arts & Culture",
  "Environment",
  "Legal",
  "Other"
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

export type LocationType = "onsite" | "remote" | "hybrid";

export type SalaryPeriod = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export type ApplicationMethod = "email" | "url" | "quickApply";

// ============================================
// JOB VIDEO
// ============================================

/** Job-specific video (for a particular job posting) */
export interface JobVideo {
  videoUrl: string;
  videoProvider?: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
  isIOPPSInterview?: boolean; // true if this is an IOPPS interview about the job
}

// ============================================
// JOB POSTING
// ============================================

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
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: SalaryPeriod;
    disclosed?: boolean;
  } | string; // Support both structured and legacy string format
  applicationLink?: string;
  applicationEmail?: string;
  createdAt?: FirestoreTimestamp | null;
  closingDate?: FirestoreTimestamp | string | null;
  active: boolean;
  viewsCount?: number;
  applicationsCount?: number;
  // Quick Apply & Enhanced Features
  quickApplyEnabled?: boolean;
  companyLogoUrl?: string;
  // Job Requirements Flags
  cpicRequired?: boolean;
  willTrain?: boolean;
  driversLicense?: boolean;
  // Job-specific video
  jobVideo?: JobVideo;
  // Payment fields
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: FirestoreTimestamp | Date | string | null;
  // Scheduled publishing
  scheduledPublishAt?: FirestoreTimestamp | Date | string | null;
  publishedAt?: FirestoreTimestamp | Date | null;
  // RSS Import fields
  importedFrom?: string;
  originalUrl?: string;
  originalApplicationLink?: string;
  noIndex?: boolean;
  expiredAt?: FirestoreTimestamp | Date | null;
  expirationReason?: string;
  // Enhanced job fields
  category?: JobCategory;
  locationType?: LocationType;
  applicationMethod?: ApplicationMethod;
  featured?: boolean;
  trcAlignment?: TRCAlignment;
  // Denormalized compatibility alias for employerName
  companyName?: string;
  // Pending employer approval flag (for jobs created before employer approval)
  pendingEmployerApproval?: boolean;
}

// ============================================
// JOB TEMPLATES
// ============================================

export interface JobTemplate {
  id: string;
  employerId: string;
  name: string; // Template name (e.g., "Senior Developer Role")
  description?: string;
  // Job fields (subset of JobPosting)
  title?: string;
  location?: string;
  employmentType?: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  jobDescription?: string; // Using different name to avoid confusion with template description
  responsibilities?: string[];
  qualifications?: string[];
  requirements?: string;
  benefits?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: SalaryPeriod;
    disclosed?: boolean;
  } | string;
  category?: JobCategory;
  locationType?: LocationType;
  // Job Requirement Flags
  cpicRequired?: boolean;
  willTrain?: boolean;
  driversLicense?: boolean;
  // Quick Apply
  quickApplyEnabled?: boolean;
  applicationLink?: string;
  applicationEmail?: string;
  // Metadata
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  usageCount?: number;
}

// ============================================
// SAVED JOBS
// ============================================

export interface SavedJob {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: FirestoreTimestamp | null;
  job?: JobPosting | null;
  // Denormalized fields from Firestore
  jobTitle?: string;
  companyName?: string;
}

// ============================================
// JOB ALERTS
// ============================================

export type JobAlertFrequency = "instant" | "daily" | "weekly";

export interface JobAlert {
  id: string;
  memberId: string;
  alertName?: string;
  keyword?: string;
  location?: string;
  employmentType?: string;
  remoteOnly?: boolean;
  indigenousOnly?: boolean;
  minSalary?: number;
  maxSalary?: number;
  frequency: JobAlertFrequency;
  active: boolean;
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  lastSent?: FirestoreTimestamp | null;
}

// ============================================
// RSS FEEDS
// ============================================

export interface RSSFeed {
  id: string;
  employerId: string;
  employerName?: string;
  feedUrl: string;
  feedName: string;
  active: boolean;
  lastSyncedAt?: FirestoreTimestamp | null;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
  syncErrors?: string[];
  totalJobsImported?: number;
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  jobExpiration?: {
    type: "days" | "feed" | "never";
    daysAfterImport?: number;
  };
  utmTrackingTag?: string;
  noIndexByGoogle?: boolean;
  updateExistingJobs?: boolean;
  feedType?: "xml" | "html";
  keywordFilter?: {
    enabled: boolean;
    keywords: string[];
    matchIn: ("title" | "description")[];
  };
  fieldMappings?: {
    jobIdOrUrl?: string;
    title?: string;
    description?: string;
    jobType?: string;
    category?: string;
    experience?: string;
    applyUrl?: string;
    expirationDate?: string;
    featured?: string;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    remote?: string;
    salaryString?: string;
    salaryFrom?: string;
    salaryTo?: string;
    salaryPeriod?: string;
  };
}

// ============================================
// SCHEDULED INTERVIEWS
// ============================================

export type ScheduledInterviewType = "virtual" | "phone" | "in-person";
export type ScheduledInterviewStatus = "scheduled" | "completed" | "cancelled" | "rescheduled" | "no-show";

export interface ScheduledInterview {
  id: string;
  applicationId: string;
  jobId: string;
  employerId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  // Scheduling details
  scheduledAt: FirestoreTimestamp | Date | string;
  duration: number; // minutes (30, 45, 60, 90)
  timezone?: string;
  // Location/meeting details
  type: ScheduledInterviewType;
  location?: string;
  meetingUrl?: string;
  phoneNumber?: string;
  // Status tracking
  status: ScheduledInterviewStatus;
  // Notes and follow-up
  notes?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  // Calendar integration
  calendarEventId?: string;
  icsFileUrl?: string;
  // Notifications
  reminderSent?: boolean;
  reminderSentAt?: FirestoreTimestamp | null;
  // Timestamps
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  cancelledAt?: FirestoreTimestamp | null;
  cancelReason?: string;
}
