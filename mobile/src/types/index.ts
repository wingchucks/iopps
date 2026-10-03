// A public job from the website's API (/api/jobs), normalized by lib/jobs.ts.
export interface JobPosting {
  id: string;
  employerId?: string;
  employerName?: string;
  title: string;
  location: string;
  employmentType: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  /** Applications go through IOPPS (the app's Quick Apply or the website's form). */
  quickApplyEnabled?: boolean;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    disclosed?: boolean;
  } | string;
  closingDate?: string;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  /** The employer's own application page, when applications happen there. */
  applicationLink?: string;
  applicationEmail?: string;
  requiresResume?: boolean;
  requiresCoverLetter?: boolean;
  requiresReferences?: boolean;
  /** False once the job has closed. */
  active: boolean;
  featured?: boolean;
  createdAt: string | null;
}

export interface EmployerProfile {
  id: string;
  organizationName: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  location?: string;
  indigenousOwned: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

// The member's users/{uid} record (role and account details).
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: string;
  createdAt: any;
  updatedAt?: any;
}

// Saved jobs: the member's saved_items records, shared with the website.
export interface SavedJob {
  id: string;
  jobId: string;
  title: string;
  employerName: string;
  savedAt: unknown;
}

// Application statuses used by the website's applications API.
export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "rejected"
  | "withdrawn";

// The member's own application (/api/applications).
export interface MemberApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerName: string;
  status: ApplicationStatus;
  appliedAt: unknown;
  updatedAt: unknown;
}

// An application to the employer's jobs (/api/employer/applications).
export interface EmployerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantLocation: string;
  applicantHeadline: string;
  status: ApplicationStatus;
  resumeUrl: string;
  resumeFileName: string;
  coverLetter: string;
  references: string;
  appliedAt: unknown;
  updatedAt: unknown;
}

// One of the employer's jobs (/api/employer/jobs), including drafts and closed jobs.
export interface EmployerJob {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  salary: string;
  status: string;
  active: boolean;
  featured: boolean;
  closingDate: string;
  createdAt: unknown;
  applicationCount: number;
}

// Conferences and other events from the website's events API (/api/events).
export interface Conference {
  id: string;
  title: string;
  organizerName: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  /** The website's display label for the dates, when it has one. */
  dates: string;
  registrationUrl: string;
  cost: string;
  /** Event type, e.g. "Conference" or "Career Fair". */
  format: string;
  featured: boolean;
}

// Scholarships and other funding (/api/scholarships).
export interface Scholarship {
  id: string;
  slug: string;
  title: string;
  provider: string;
  description: string;
  amount: string;
  /** "YYYY-MM-DD", "Rolling" or "". */
  deadline: string;
  level: string;
  region: string;
  type: string;
}

// Shop Indigenous vendors (the public shop_vendors records the website lists).
export interface VendorProfile {
  id: string;
  businessName: string;
  category: string;
  location: string;
  about: string;
  logoUrl: string;
  heroImageUrl: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  instagram: string;
  facebook: string;
  featured: boolean;
}

// Pow wows from the website's events API (/api/events).
export interface PowwowEvent {
  id: string;
  name: string;
  host: string;
  location: string;
  startDate: string;
  endDate: string;
  dateRange: string;
  description: string;
  registrationUrl: string;
}

// IOPPS live streams and replays (/api/livestreams/youtube).
export interface LiveStreamEvent {
  id: string;
  title: string;
  host: string;
  description: string;
  category: string;
  startTime: string;
  status: "Live Now" | "Upcoming" | "Replay";
  platform: string;
  url: string;
}

// Messaging (shared with the website; see src/lib/messaging.ts)
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt?: any;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt?: any;
  lastSenderId: string;
  unreadBy: string; // uid of the participant who has not read the latest message
}

export interface ConversationPeer {
  uid: string;
  displayName: string;
  photoURL?: string;
}

// Notifications
export type NotificationType =
  | "new_application"
  | "application_status"
  | "new_message"
  | "job_alert"
  | "employer_approved"
  | "employer_rejected"
  | "scholarship_status"
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
  createdAt?: any;
}
