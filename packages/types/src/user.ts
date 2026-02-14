/**
 * User and member profile types for the IOPPS platform.
 */

import type { FirestoreTimestamp, TimestampLike } from './common';
import type { ProgramLevel, ProgramCategory, ProgramDelivery, EducationProgram } from './education';
import type { Scholarship, ExtendedScholarship } from './scholarship';
import type { School } from './school';

// ============================================
// USER ROLES & ACCOUNT STATE
// ============================================

export type UserRole = "community" | "employer" | "moderator" | "admin";

export type EmployerStatus = "incomplete" | "pending" | "approved" | "rejected" | "deleted";

// ============================================
// MEMBER PROFILE
// ============================================

export type MemberType = "jobSeeker" | "professional" | "communityMember";

export type ExperienceLevel = "student" | "entry" | "mid" | "senior" | "executive";

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
}

/** Education Pillar - Enhanced tracking for member education interests */
export interface MemberEducationInterests {
  seekingEducation: boolean;
  educationLevelInterested?: ProgramLevel[];
  fieldsInterested?: ProgramCategory[];
  preferredDelivery?: ProgramDelivery[];
  preferredLocations?: string[];
  timeline?: "immediately" | "next_6_months" | "next_year" | "exploring";
}

/** Education history entry for a member profile */
export interface MemberEducationHistory {
  id: string;
  schoolId?: string;
  schoolName?: string;
  programId?: string;
  programName?: string;
  status: "current" | "completed" | "did_not_complete";
  startYear?: number;
  endYear?: number;
  isVisible?: boolean;
}

/** Event RSVP entry on a member profile */
export interface EventRSVP {
  eventId: string;
  eventType: "education" | "community" | "conference";
  rsvpDate: FirestoreTimestamp | null;
  status: "going" | "maybe" | "not_going";
}

export interface MemberProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  photoURL?: string; // For compatibility with Firebase User
  tagline?: string;
  bio?: string; // About me / personal summary
  location?: string;
  skills?: string[];
  experience?: WorkExperience[];
  experienceSummary?: string; // Legacy field for backward compatibility
  education?: Education[];
  educationSummary?: string; // Legacy field for backward compatibility
  portfolio?: PortfolioItem[];
  resumeUrl?: string;
  coverLetterTemplate?: string;
  indigenousAffiliation?: string;
  availableForInterviews?: string;
  messagingHandle?: string;
  // Identity fields
  nation?: string;
  territory?: string;
  band?: string;
  pronouns?: string;
  // Career fields
  memberType?: MemberType;
  openToWork?: boolean;
  jobTypes?: string[];
  preferredLocations?: string[];
  willingToRelocate?: boolean;
  experienceLevel?: ExperienceLevel;
  industry?: string;
  // Quick Apply Settings
  quickApplyEnabled?: boolean;
  defaultCoverLetter?: string;
  wizardDismissed?: boolean;
  // Education Pillar - Enhanced tracking
  educationInterests?: MemberEducationInterests;
  educationHistory?: MemberEducationHistory[];
  savedProgramIds?: string[];
  savedScholarshipIds?: string[];
  savedSchoolIds?: string[];
  eventRsvps?: EventRSVP[];
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}

// ============================================
// COVER LETTER TEMPLATES
// ============================================

export interface CoverLetterTemplate {
  id: string;
  userId: string;
  name: string; // e.g., "Tech Job Template"
  content: {
    recipientName?: string;
    recipientTitle?: string;
    companyName?: string;
    companyAddress?: string;
    opening?: string;
    body?: string;
    closing?: string;
    signOff?: string;
  };
  designId: 'minimal' | 'modern' | 'bold';
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}

// ============================================
// EMAIL PREFERENCES
// ============================================

export type EmailDigestFrequency = "instant" | "daily" | "weekly" | "never";

export interface EmailPreferences {
  id: string;
  userId: string;

  // Global controls
  unsubscribedAll: boolean;

  // Job Alerts (existing system - controlled separately via jobAlerts collection)
  jobAlertsEnabled: boolean;

  // Conference Updates
  conferenceUpdates: boolean;
  conferenceFrequency: EmailDigestFrequency;
  conferenceCategories: string[]; // empty = all categories

  // Pow Wows & Events
  powwowUpdates: boolean;
  powwowFrequency: EmailDigestFrequency;
  powwowRegions: string[]; // empty = all regions

  // Shop Indigenous
  shopUpdates: boolean;
  shopFrequency: EmailDigestFrequency;
  shopCategories: string[]; // empty = all categories

  // Training Programs
  trainingUpdates: boolean;
  trainingFrequency: EmailDigestFrequency;
  trainingCategories: string[]; // empty = all categories
  trainingFormats: ("in-person" | "online" | "hybrid")[]; // empty = all formats

  // Platform Newsletter
  weeklyDigest: boolean;

  // Account Notifications (always on by default, can't fully disable)
  applicationUpdates: boolean; // job application status changes
  messageNotifications: boolean; // new messages

  // Metadata
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// SAVED ITEMS (Member bookmarks)
// ============================================

export interface SavedProgram {
  id: string;
  programId: string;
  memberId: string;
  createdAt?: FirestoreTimestamp | null;
  program?: EducationProgram | null;
}

export interface SavedScholarship {
  id: string;
  scholarshipId: string;
  memberId: string;
  createdAt?: FirestoreTimestamp | null;
  scholarship?: Scholarship | ExtendedScholarship | null;
}

export interface SavedSchool {
  id: string;
  schoolId: string;
  memberId: string;
  createdAt?: FirestoreTimestamp | null;
  school?: School | null;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
  | "new_application"
  | "application_status"
  | "new_message"
  | "job_alert"
  | "employer_approved"
  | "employer_rejected"
  | "scholarship_status"
  | "interview_scheduled"
  | "interview_cancelled"
  | "interview_rescheduled"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedConversationId?: string;
  relatedEmployerId?: string;
  createdAt?: FirestoreTimestamp | null;
}

// ============================================
// MESSAGING
// ============================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "employer" | "member";
  content: string;
  read: boolean;
  createdAt?: FirestoreTimestamp | null;
}

export interface Conversation {
  id: string;
  employerId: string;
  memberId: string;
  jobId?: string;
  applicationId?: string;
  // Denormalized fields for quick display
  employerName?: string;
  memberName?: string;
  memberEmail?: string;
  jobTitle?: string;
  // Conversation state
  lastMessage?: string;
  lastMessageAt?: FirestoreTimestamp | null;
  lastMessageBy?: string;
  employerUnreadCount: number;
  memberUnreadCount: number;
  // Status
  status: "active" | "archived";
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}
