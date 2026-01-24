import type { Timestamp } from "firebase/firestore";

// Job-specific video type
export interface JobVideo {
  videoUrl: string;
  videoProvider?: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
  isIOPPSInterview?: boolean;
}

export interface JobPosting {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  location: string;
  employmentType: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
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
  applicationLink?: string;
  applicationEmail?: string;
  active: boolean;
  featured?: boolean;
  createdAt: any;
  updatedAt?: any;
  expiresAt?: any;
  viewsCount?: number;
  applicationsCount?: number;
  paymentStatus?: "paid" | "pending" | "failed";
  paymentId?: string;
  companyLogoUrl?: string;
  // Job Requirements Flags
  cpicRequired?: boolean; // Criminal record check required
  willTrain?: boolean; // Employer will provide training
  // Job-specific video
  jobVideo?: JobVideo;
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  location?: string;
  bio?: string;
  resumeUrl?: string;
  resumeName?: string;
  linkedIn?: string;
  website?: string;
  role: "user" | "employer" | "admin" | "moderator";
  createdAt: any;
  updatedAt?: any;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  employerId: string;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  resumeUrl?: string;
  coverLetter?: string;
  createdAt: any;
}

// Saved Jobs
export interface SavedJob {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: any;
  job?: JobPosting | null;
}

// Job Alerts
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
  createdAt?: any;
  updatedAt?: any;
  lastSent?: any;
}

// Job Applications (enhanced)
export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired"
  | "withdrawn";

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
  createdAt?: any;
  updatedAt?: any;
  // Denormalized job data for display
  jobTitle?: string;
  jobEmployerName?: string;
  jobLocation?: string;
}

// Conferences
export interface Conference {
  id: string;
  employerId: string;
  employerName?: string;
  organizerName?: string;
  title: string;
  description: string;
  location: string;
  startDate: any;
  endDate: any;
  registrationLink?: string;
  registrationUrl?: string;
  cost?: string;
  format?: string;
  active: boolean;
  createdAt?: any;
  featured?: boolean;
  viewsCount?: number;
}

// Scholarships
export interface Scholarship {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  provider: string;
  description: string;
  amount?: string;
  deadline?: any;
  level: string;
  region?: string;
  type: string;
  createdAt?: any;
  active: boolean;
}

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  status: ApplicationStatus;
  education?: string;
  essay?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Vendors / Shop
export interface VendorProfile {
  id: string;
  ownerUserId: string;
  businessName: string;
  tagline?: string;
  category?: string;
  location?: string;
  region?: string;
  websiteUrl?: string;
  shopUrl?: string;
  isIndigenousOwned: boolean;
  about?: string;
  originStory?: string;
  communityConnections?: string;
  offerings?: string;
  shipsCanadaWide?: boolean;
  isOnlineOnly?: boolean;
  hasInPersonLocation?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  otherLink?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
  active?: boolean;
  featured?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ShopListing {
  id: string;
  employerId: string;
  vendorId?: string;
  owner?: string;
  name: string;
  description: string;
  category: string;
  location: string;
  shipsCanadaWide?: boolean;
  onlineStore?: boolean;
  tags?: string[];
  website?: string;
  createdAt?: any;
  active: boolean;
}

// Pow Wows
export interface PowwowEvent {
  id: string;
  employerId: string;
  name: string;
  host?: string;
  location: string;
  season?: string;
  startDate?: any;
  endDate?: any;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  createdAt?: any;
  active: boolean;
}

// Live Streams
export interface LiveStreamEvent {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  host: string;
  description: string;
  category: string;
  startTime: string;
  status: "Live Now" | "Upcoming" | "Replay" | string;
  platform: string;
  createdAt?: any;
  active: boolean;
}

// Messaging
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "employer" | "member";
  content: string;
  read: boolean;
  createdAt?: any;
}

export interface Conversation {
  id: string;
  employerId: string;
  memberId: string;
  jobId?: string;
  applicationId?: string;
  employerName?: string;
  memberName?: string;
  memberEmail?: string;
  jobTitle?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageBy?: string;
  employerUnreadCount: number;
  memberUnreadCount: number;
  status: "active" | "archived";
  createdAt?: any;
  updatedAt?: any;
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

// Interviews
export type ScheduledInterviewStatus = "scheduled" | "completed" | "cancelled" | "no-show";
export type InterviewType = "virtual" | "phone" | "in-person";

export interface ScheduledInterview {
  id: string;
  employerId: string;
  applicationId: string;
  candidateId: string;
  jobId?: string;
  jobTitle?: string;
  candidateName?: string;
  candidateEmail?: string;
  type: InterviewType;
  scheduledAt: any; // Timestamp
  duration: number; // minutes
  meetingUrl?: string;
  phoneNumber?: string;
  location?: string;
  interviewerName?: string;
  notes?: string;
  status: ScheduledInterviewStatus;
  cancelReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Talent Search
export type ExperienceLevel = "entry" | "mid" | "senior" | "";
export type Availability = "yes" | "maybe" | "no" | "";

export interface TalentSearchFilters {
  query?: string;
  location?: string;
  skills?: string[];
  experience?: ExperienceLevel;
  availability?: Availability;
  hasResume?: boolean;
}

export interface TalentSearchResult {
  member: UserProfile;
  matchScore?: number;
  matchReasons?: string[];
}

export interface SavedTalent {
  id: string;
  employerId: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  notes?: string;
  tags?: string[];
  savedAt?: any;
}
