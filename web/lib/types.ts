import type { Timestamp } from "firebase/firestore";

export type UserRole = "community" | "employer" | "moderator" | "admin";
export type EmployerStatus = "pending" | "approved" | "rejected" | "deleted";

export type OpportunityType = 'job' | 'event' | 'scholarship' | 'training' | 'business';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organizationName: string;
  organizationId: string;
  location: string;
  postedAt: Date | Timestamp;
  deadline?: Date | Timestamp | string;
  tags: string[];
  imageUrl?: string;
  matchScore?: number; // 0-100
  trcAligned?: boolean;
  isNew?: boolean; // Added in last 24h
  salary?: string; // e.g. "$55k - $65k"
  connectionCount?: number; // e.g. 4 connections work here
  originalObject: JobPosting | PowwowEvent | Conference | Scholarship; // Underlying data
}

// ============================================
// SOCIAL FEED (COMMUNITY CONTENT)
// ============================================

// Union type for the Unified Feed (Forward declaration)
export type FeedItem =
  | { type: 'opportunity'; data: Opportunity }
  | { type: 'post'; data: Post };

// ============================================

// Job Categories
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

// Location Types
export type LocationType = "onsite" | "remote" | "hybrid";

// Salary Period
export type SalaryPeriod = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

// Application Method
export type ApplicationMethod = "email" | "url" | "quickApply";

export interface Interview {
  id: string;
  videoUrl: string;
  videoProvider: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
  highlights?: string[];
  transcript?: string;
  interviewDate?: Timestamp | null;
  duration?: string;
  viewsCount?: number;
  order?: number;
  active?: boolean;
  isIOPPSInterview?: boolean; // true = conducted by IOPPS, false = employer's own promo video
  addedBy?: string; // User ID of who added (admin or employer)
  createdAt?: Timestamp | null;
}

// Company intro/about video
export interface CompanyVideo {
  videoUrl: string;
  videoProvider?: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
}

// Job-specific video (for a particular job posting)
export interface JobVideo {
  videoUrl: string;
  videoProvider?: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
  isIOPPSInterview?: boolean; // true if this is an IOPPS interview about the job
}

export interface EmployerSubscription {
  active: boolean;
  tier: string;
  purchasedAt?: Timestamp | Date | null;
  expiresAt?: Timestamp | Date | null;
  paymentId?: string;
  amountPaid?: number;
  jobCredits: number;
  jobCreditsUsed: number;
  featuredJobCredits: number;
  featuredJobCreditsUsed: number;
  unlimitedPosts: boolean;
}

// ============================================
// DIRECTORY VISIBILITY (Engagement-Based)
// ============================================

// Reason why an organization is visible/hidden in the directory
export type VisibilityReason =
  | 'grandfathered'    // Permanent visibility for legacy orgs
  | 'subscription'     // Has active employer subscription
  | 'vendor'           // Has active vendor subscription
  | 'featured_job'     // Has featured job extending visibility
  | 'job'              // Has standard job extending visibility
  | 'expired';         // No active engagement, visibility expired

// Source that contributes to visibility
export type VisibilitySource = 'subscription' | 'vendor' | 'featured_job' | 'job' | 'none';

// Debug info about what's driving visibility
export interface VisibilitySourceDetails {
  maxSource: VisibilitySource;
  maxUntil?: Timestamp | Date | null;
  // Individual source dates for debugging
  subscriptionUntil?: Timestamp | Date | null;
  vendorUntil?: Timestamp | Date | null;
  jobsMaxUntil?: Timestamp | Date | null;
  featuredJobsMaxUntil?: Timestamp | Date | null;
  eligibleJobsCount?: number;
}

// Grant types for free posting packages
export type GrantType = "single" | "featured" | "tier1" | "tier2";

export interface FreePostingGrant {
  enabled: boolean;
  grantType: GrantType;
  reason?: string;
  // Credits granted
  jobCredits: number;
  jobCreditsUsed: number;
  featuredCredits: number;
  featuredCreditsUsed: number;
  unlimitedPosts: boolean;
  // Duration
  grantedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  grantedBy: string;
}

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export type IndustryType =
  | 'government'
  | 'healthcare'
  | 'education'
  | 'construction'
  | 'natural-resources'
  | 'environmental'
  | 'technology'
  | 'arts-culture'
  | 'finance'
  | 'legal'
  | 'nonprofit'
  | 'retail'
  | 'transportation'
  | 'other';

export interface TRCAlignment {
  hasIndigenousHiringStrategy: boolean;
  leadershipTrainingComplete: boolean;
  isIndigenousOwned: boolean;
  commitmentStatement: string; // Max 140 chars
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  website?: string;
  location?: string;
  logoUrl?: string;
  // Enhanced profile fields
  bannerUrl?: string;
  socialLinks?: SocialLinks;
  industry?: IndustryType;
  companySize?: CompanySize;
  foundedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  // Video content
  companyIntroVideo?: CompanyVideo; // "About Us" intro video
  interviews?: Interview[]; // IOPPS interviews + employer promo videos (distinguished by isIOPPSInterview flag)
  status?: EmployerStatus;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
  rejectionReason?: string;
  subscription?: EmployerSubscription;
  // Vendor subscription (for Shop Indigenous vendors linked to org)
  vendorSubscription?: {
    active: boolean;
    vendorId: string;
    expiresAt?: Timestamp | Date | null;
  };
  // Directory Visibility (engagement-based) - SERVER-WRITTEN ONLY
  isGrandfathered?: boolean;                    // Permanent visibility for legacy orgs
  isDirectoryVisible?: boolean;                  // Computed: visible in directory + search
  directoryVisibleUntil?: Timestamp | null;      // null ONLY if grandfathered
  visibilityReason?: VisibilityReason;           // Why org is visible/hidden
  visibilityComputedAt?: Timestamp | null;       // Debug: when visibility was last computed
  visibilitySourceDetails?: VisibilitySourceDetails; // Debug: detailed source info
  // Admin Bypass - Free posting without payment (legacy fields for backward compatibility)
  freePostingEnabled?: boolean;
  freePostingReason?: string;
  freePostingGrantedAt?: Timestamp | null;
  freePostingGrantedBy?: string;
  // Enhanced free posting grant
  freePostingGrant?: FreePostingGrant;
  // Organization Capabilities (legacy - for multi-mode dashboard)
  capabilities?: OrganizationCapability[];
  // NEW: Module-based dashboard system
  enabledModules?: OrganizationModule[];
  moduleSettings?: ModuleSettings;
  lastActiveModule?: OrganizationModule;
  // Education Mode settings
  educationSettings?: EducationSettings;
  // TRC Alignment
  trcAlignment?: TRCAlignment;
  // Indigenous Verification
  indigenousVerification?: IndigenousVerification;
  // Team Access
  teamMembers?: TeamMember[];
  teamSettings?: TeamSettings;
  // Notification Preferences
  notificationPreferences?: EmployerNotificationPreferences;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Employer Notification Preferences
export interface EmployerNotificationPreferences {
  // Application notifications
  newApplications: boolean; // Notify when someone applies
  applicationStatusChanges: boolean; // Notify when application status changes

  // Job notifications
  jobExpiring: boolean; // Notify when a job is about to expire
  scheduledJobPublished: boolean; // Notify when a scheduled job goes live

  // Training program notifications
  trainingProgramExpiring?: boolean; // Notify when a training program is about to expire
  trainingProgramPublished?: boolean; // Notify when a scheduled training goes live
  trainingRegistrations?: boolean; // Notify about new registrations

  // Event notifications
  eventReminders?: boolean; // Remind about upcoming events
  eventPublished?: boolean; // Notify when scheduled events go live
  eventRegistrations?: boolean; // Notify about event registrations

  // Product/Service notifications
  productServiceExpiring?: boolean; // Notify when listings are about to expire
  productServicePublished?: boolean; // Notify when scheduled listings go live
  productServiceInquiries?: boolean; // Notify about product/service inquiries

  // Scholarship/Grant notifications
  scholarshipGrantExpiring?: boolean; // Notify when opportunities are about to expire
  scholarshipGrantPublished?: boolean; // Notify when scheduled items go live
  scholarshipApplications?: boolean; // Notify about scholarship applications

  // Team notifications
  teamInvitations: boolean; // Notify about team invitations
  teamActivity: boolean; // Notify about team member activity

  // Digest notifications
  weeklyDigest: boolean; // Weekly summary of activity
  dailyActivitySummary?: boolean; // Daily summary of team activity

  // Marketing
  marketingEmails: boolean; // Product updates, tips, etc.
}

// Scheduled Interview (for job application interviews)
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
  scheduledAt: Timestamp | Date | string;
  duration: number; // minutes (30, 45, 60, 90)
  timezone?: string;
  // Location/meeting details
  type: ScheduledInterviewType;
  location?: string; // Physical address for in-person, or meeting URL for virtual
  meetingUrl?: string; // Video call link
  phoneNumber?: string; // For phone interviews
  // Status tracking
  status: ScheduledInterviewStatus;
  // Notes and follow-up
  notes?: string; // Employer notes
  interviewerName?: string;
  interviewerEmail?: string;
  // Calendar integration
  calendarEventId?: string;
  icsFileUrl?: string;
  // Notifications
  reminderSent?: boolean;
  reminderSentAt?: Timestamp | null;
  // Timestamps
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
  cancelReason?: string;
}

// Indigenous Business Verification
export type IndigenousVerificationStatus = "not_requested" | "pending" | "approved" | "rejected";

export interface IndigenousVerification {
  status: IndigenousVerificationStatus;
  // For approved verifications
  isIndigenousOwned?: boolean; // Majority Indigenous owned (51%+)
  isIndigenousLed?: boolean; // Indigenous leadership/management
  nationAffiliation?: string; // e.g., "Cree Nation", "Métis Nation"
  certifications?: string[]; // e.g., "CCAB Certified", "CAMSC Certified"
  // Request details
  requestedAt?: Timestamp | null;
  requestNotes?: string; // Notes from employer during request
  // Review details
  reviewedAt?: Timestamp | null;
  reviewedBy?: string; // Admin who reviewed
  reviewNotes?: string; // Internal admin notes
  rejectionReason?: string;
}

// Team Access Types
export type TeamRole = "admin" | "editor" | "viewer";

export interface TeamMember {
  id: string; // User's Firebase UID
  email: string;
  displayName?: string;
  role: TeamRole;
  addedBy: string; // UID of who invited this member
  addedAt: Timestamp | null;
  lastAccessedAt?: Timestamp | null;
}

export type TeamInvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface TeamInvitation {
  id: string;
  employerId: string;
  organizationName: string; // Denormalized for display
  invitedEmail: string;
  invitedBy: string; // UID
  invitedByName?: string; // Denormalized for display
  role: TeamRole;
  status: TeamInvitationStatus;
  token: string; // Secret token for email invitation links
  expiresAt: Timestamp | null;
  createdAt: Timestamp | null;
  acceptedAt?: Timestamp | null;
}

export interface TeamSettings {
  allowInvitations: boolean;
  defaultRole: TeamRole;
  maxTeamSize?: number; // Optional limit
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
  createdAt?: Timestamp | null;
  closingDate?: Timestamp | string | null;
  active: boolean;
  viewsCount?: number;
  applicationsCount?: number;
  // Quick Apply & Enhanced Features
  quickApplyEnabled?: boolean; // Allow applications through IOPPS
  companyLogoUrl?: string; // For enhanced job cards
  // Job Requirements Flags
  cpicRequired?: boolean; // Criminal record check required
  willTrain?: boolean; // Employer will provide training
  driversLicense?: boolean; // Driver's license required
  // Job-specific video
  jobVideo?: JobVideo; // Video specifically about this job posting
  // Payment fields
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  // Scheduled publishing
  scheduledPublishAt?: Timestamp | Date | string | null; // When to auto-publish
  publishedAt?: Timestamp | Date | null; // When job was actually published
  // RSS Import fields
  importedFrom?: string; // RSS feed ID this job came from
  originalUrl?: string; // Original job listing URL
  originalApplicationLink?: string; // Original application URL (without UTM)
  noIndex?: boolean; // If true, tell search engines not to index
  expiredAt?: Timestamp | Date | null; // When job was auto-expired
  expirationReason?: string; // Why job was expired (e.g., "Removed from feed")
  // Enhanced job fields
  category?: JobCategory;
  locationType?: LocationType;
  applicationMethod?: ApplicationMethod;

  featured?: boolean;
  trcAlignment?: TRCAlignment;
}

// Job Templates (reusable templates for employers)
export interface JobTemplate {
  id: string;
  employerId: string;
  name: string; // Template name (e.g., "Senior Developer Role")
  description?: string; // Optional description of what this template is for
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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  usageCount?: number; // How many times this template has been used
}

// Conference sub-types
export interface ConferenceVenue {
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  mapUrl?: string;
  parkingInfo?: string;
  transitInfo?: string;
  accessibilityInfo?: string;
  nearbyHotels?: string;
}

export interface ConferenceSession {
  id: string;
  time: string;
  endTime?: string;
  title: string;
  description?: string;
  speakerIds?: string[];
  location?: string;
  track?: string;
  type?: 'keynote' | 'workshop' | 'panel' | 'networking' | 'break' | 'ceremony' | 'other';
}

export interface ConferenceAgendaDay {
  date: string;
  title?: string;
  sessions: ConferenceSession[];
}

export interface ConferenceSpeaker {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  nation?: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  topics?: string[];
}

export interface ConferenceSponsor {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';
  description?: string;
}

export interface ConferenceFAQ {
  question: string;
  answer: string;
}

export interface ConferenceRegistrationOptions {
  earlyBirdPrice?: string;
  earlyBirdDeadline?: Timestamp | string | null;
  regularPrice?: string;
  groupRate?: string;
  groupMinimum?: number;
  indigenousRate?: string;
  studentRate?: string;
  virtualPrice?: string;
  registrationDeadline?: Timestamp | string | null;
}

// Visibility tier for conferences
export type ConferenceVisibilityTier = "standard" | "demoted" | "featured";

export interface Conference {
  id: string;
  employerId: string;
  employerName?: string;
  organizerName?: string;
  title: string;
  description: string;
  location: string;
  startDate: Timestamp | string | null;
  endDate: Timestamp | string | null;
  registrationLink?: string;
  registrationUrl?: string;
  cost?: string;
  format?: string;
  active: boolean;
  createdAt?: Timestamp | null;

  // Visibility & Lifecycle fields (45-day free visibility system)
  publishedAt?: Timestamp | Date | string | null;
  visibilityTier?: ConferenceVisibilityTier;
  freeVisibilityExpiresAt?: Timestamp | Date | string | null;
  eventFingerprint?: string;
  freeVisibilityUsed?: boolean;

  // Payment & Featured fields
  featured?: boolean;
  featuredExpiresAt?: Timestamp | Date | string | null;
  featurePlan?: "FEATURED_90" | "FEATURED_365";
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  viewsCount?: number;

  // Rich Media
  imageUrl?: string;
  bannerImageUrl?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  promoVideoUrl?: string;

  // Venue Details
  venue?: ConferenceVenue;

  // Schedule & Agenda
  agenda?: ConferenceAgendaDay[];

  // Speakers
  speakers?: ConferenceSpeaker[];

  // Registration Options
  registrationOptions?: ConferenceRegistrationOptions;

  // Event Details
  eventType?: 'in-person' | 'virtual' | 'hybrid';
  livestreamUrl?: string;
  virtualPlatform?: string;
  expectedAttendees?: string;
  targetAudience?: string[];
  topics?: string[];
  timezone?: string;

  // Indigenous-Specific
  trc92Commitment?: boolean;
  indigenousProtocols?: string;
  elderAcknowledgement?: string;
  territoryAcknowledgement?: string;
  indigenousLanguageSupport?: string[];
  indigenousFocused?: boolean;

  // Accessibility
  accessibilityFeatures?: string[];

  // Sponsors
  sponsors?: ConferenceSponsor[];

  // FAQ
  faqs?: ConferenceFAQ[];

  // Contact
  contactEmail?: string;
  contactPhone?: string;

  // Social
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  // Analytics
  registrationClicks?: number;
  savedCount?: number;
}

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "hired"
  | "withdrawn";

// Application stage history entry
export interface ApplicationStageEntry {
  status: ApplicationStatus;
  timestamp: Timestamp | Date;
  changedBy?: string; // User ID who made the change
  note?: string; // Optional note about the transition
}

// Applicant Notes (employer private notes on applications)
export interface ApplicantNote {
  id: string;
  content: string;
  createdBy: string; // User ID
  createdByName?: string; // Denormalized display name
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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

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

export interface MemberProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
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
  // Quick Apply Settings
  quickApplyEnabled?: boolean; // Allow using saved resume for quick applications
  defaultCoverLetter?: string; // Pre-filled cover letter for quick applies
  wizardDismissed?: boolean;
  // Education Pillar - Enhanced tracking
  educationInterests?: MemberEducationInterests;
  educationHistory?: MemberEducationHistory[];
  savedProgramIds?: string[];
  savedScholarshipIds?: string[];
  savedSchoolIds?: string[];
  eventRsvps?: EventRSVP[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SavedJob {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  job?: JobPosting | null;
}

export interface SavedTraining {
  id: string;
  programId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  program?: TrainingProgram | null;
}

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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastSent?: Timestamp | null;
}

export interface Scholarship {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  provider: string;
  providerName?: string; // Alias for provider
  description: string;
  amount?: any;
  deadline?: Timestamp | string | Date | null;
  level: string;
  region?: string;
  type: string;
  imageUrl?: string;
  imagePath?: string;
  createdAt?: Timestamp | null;
  active: boolean;
  status?: "active" | "upcoming" | "closed";
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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// ============================================
// SHOP INDIGENOUS - Vendor Types
// ============================================

export type VendorStatus = 'draft' | 'pending' | 'active' | 'suspended';

export const VENDOR_CATEGORIES = [
  'Art & Crafts',
  'Jewelry & Accessories',
  'Clothing & Apparel',
  'Food & Beverages',
  'Health & Wellness',
  'Home & Living',
  'Books & Media',
  'Services',
  'Other',
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

export const NORTH_AMERICAN_REGIONS = [
  // Canada
  'British Columbia',
  'Alberta',
  'Saskatchewan',
  'Manitoba',
  'Ontario',
  'Quebec',
  'New Brunswick',
  'Nova Scotia',
  'Prince Edward Island',
  'Newfoundland and Labrador',
  'Yukon',
  'Northwest Territories',
  'Nunavut',
  // United States
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  // Online
  'National / Online Only',
] as const;

export type NorthAmericanRegion = typeof NORTH_AMERICAN_REGIONS[number];

// Backwards compatibility aliases
export const CANADIAN_REGIONS = NORTH_AMERICAN_REGIONS;
export type CanadianRegion = NorthAmericanRegion;

export interface Vendor {
  id: string;
  userId: string; // Owner's user ID

  // Business Info
  businessName: string;
  slug: string; // URL-friendly identifier
  tagline?: string;
  description: string;
  category: VendorCategory;

  // Location
  location?: string; // City/Town
  region: NorthAmericanRegion;
  offersShipping: boolean;
  onlineOnly: boolean;

  // Contact & Links
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;

  // Media
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  themeColor?: string; // Hex color code for branding

  // Indigenous Identity
  nation?: string; // First Nation, Métis, Inuit affiliation
  communityStory?: string; // Their story and connection to community

  // Status & Visibility
  status: VendorStatus;
  featured: boolean;
  verified: boolean;

  // Analytics
  viewCount: number;

  // Payment
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'cancelled' | 'past_due';
  subscriptionEndsAt?: Timestamp | null;
  // Admin Bypass - Free listing without subscription
  freeListingEnabled?: boolean;
  freeListingReason?: string;
  freeListingGrantedAt?: Timestamp | null;
  freeListingGrantedBy?: string;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Vendor Inquiry (from potential customers)
export interface VendorInquiry {
  id: string;
  vendorId: string;
  productId?: string; // Optional - if inquiry is about a specific product

  // Sender info
  senderName: string;
  senderEmail: string;
  senderPhone?: string;

  // Inquiry details
  subject: string;
  message: string;

  // Status
  status: 'new' | 'read' | 'replied' | 'archived';
  repliedAt?: Timestamp | null;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Content Flag / Report for moderation queue
export type FlaggedContentType = 'job' | 'vendor' | 'product' | 'member' | 'employer' | 'post' | 'comment';
export type FlagReason = 'spam' | 'inappropriate' | 'misleading' | 'offensive' | 'scam' | 'duplicate' | 'other';
export type FlagStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ContentFlag {
  id: string;

  // What is being flagged
  contentType: FlaggedContentType;
  contentId: string;
  contentTitle?: string; // Denormalized for display
  contentPreview?: string; // Short preview of the content

  // Who flagged it
  reporterId?: string; // Optional - anonymous reports allowed
  reporterEmail?: string;
  reporterName?: string;

  // Flag details
  reason: FlagReason;
  reasonDetails?: string; // Additional context from reporter

  // Moderation
  status: FlagStatus;
  reviewedBy?: string; // Moderator user ID
  reviewedAt?: Timestamp | null;
  moderatorNotes?: string;
  actionTaken?: 'none' | 'warned' | 'removed' | 'banned';

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface VendorProduct {
  id: string;
  vendorId: string;

  // Product Info
  name: string;
  description: string;
  category: string;
  price?: number; // In cents
  priceDisplay?: string; // e.g., "From $50" or "Contact for pricing"

  // Media
  imageUrl?: string;
  images?: string[];

  // Availability
  inStock: boolean;
  madeToOrder: boolean;

  // Display
  featured: boolean;
  sortOrder: number;
  active: boolean;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Event type options for Pow Wows & Events
export const POWWOW_EVENT_TYPES = [
  'Pow Wow',
  'Sports',
  'Career Fair',
  'Other',
] as const;
export type PowwowEventType = typeof POWWOW_EVENT_TYPES[number];

export interface PowwowEvent {
  id: string;
  employerId: string;
  name: string;
  host?: string;
  location: string;
  region?: NorthAmericanRegion;
  eventType?: PowwowEventType;
  season?: string;
  startDate?: Timestamp | string | null;
  endDate?: Timestamp | string | null;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  imageUrl?: string;
  featured?: boolean;
  createdAt?: Timestamp | null;
  active: boolean;
}

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
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface PowwowRegistration {
  id: string;
  powwowId: string;
  employerId: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  specialRequests?: string;
  createdAt?: Timestamp | null;
}

export interface ConferenceRegistration {
  id: string;
  conferenceId: string;
  employerId: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  specialRequests?: string;
  createdAt?: Timestamp | null;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message?: string;
  createdAt?: Timestamp | null;
  status: "new" | "read" | "responded";
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  announcementBanner: {
    active: boolean;
    message: string;
    link?: string;
    type: "info" | "warning" | "error" | "success";
  };
  features: {
    enableStripe: boolean;
    enableJobPosting: boolean;
    enableScholarships: boolean;
  };
  updatedAt?: Timestamp | null;
  updatedBy?: string;
}

export interface RSSFeed {
  id: string;
  employerId: string;
  employerName?: string;
  feedUrl: string;
  feedName: string; // User-friendly name
  active: boolean;
  lastSyncedAt?: Timestamp | null;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
  syncErrors?: string[];
  totalJobsImported?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  // SmartJobBoard-like features
  jobExpiration?: {
    type: "days" | "feed" | "never"; // days = expire after X days, feed = expire when removed from feed, never = don't auto-expire
    daysAfterImport?: number; // Only used when type is "days"
  };
  utmTrackingTag?: string; // Append to application URLs for analytics (e.g., utm_source=siga&utm_medium=jobboard)
  noIndexByGoogle?: boolean; // If true, mark imported jobs with noindex meta tag
  updateExistingJobs?: boolean; // If true, update existing jobs on import instead of skipping
  feedType?: "xml" | "html"; // Type of feed - XML/RSS or HTML scraping
  // Keyword filtering - filter jobs based on keywords in title/description
  keywordFilter?: {
    enabled: boolean;
    keywords: string[]; // Custom keywords (empty = use default Indigenous keywords)
    matchIn: ("title" | "description")[]; // Where to search for keywords
  };
  // Field mappings - maps job fields to XML element names
  fieldMappings?: {
    jobIdOrUrl?: string; // XML field for job ID or URL (used for deduplication)
    title?: string; // XML field for job title
    description?: string; // XML field for job description
    jobType?: string; // XML field for employment type (Full-time, Part-time, etc.)
    category?: string; // XML field for job category
    experience?: string; // XML field for experience requirements
    applyUrl?: string; // XML field for application URL
    expirationDate?: string; // XML field for job expiration date
    featured?: string; // XML field for featured flag
    // Location fields
    location?: string; // XML field for combined location (city or full location string)
    city?: string; // XML field for city
    state?: string; // XML field for state/province
    country?: string; // XML field for country
    zipCode?: string; // XML field for zip/postal code
    remote?: string; // XML field for remote work flag
    // Salary fields
    salaryString?: string; // XML field for combined salary string
    salaryFrom?: string; // XML field for minimum salary
    salaryTo?: string; // XML field for maximum salary
    salaryPeriod?: string; // XML field for salary period (hourly, yearly, etc.)
  };
}

// Messaging Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "employer" | "member";
  content: string;
  read: boolean;
  createdAt?: Timestamp | null;
}

export interface Conversation {
  id: string;
  employerId: string;
  memberId: string;
  jobId?: string; // Optional link to job application
  applicationId?: string; // Optional link to specific application
  // Denormalized fields for quick display
  employerName?: string;
  memberName?: string;
  memberEmail?: string;
  jobTitle?: string;
  // Conversation state
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  lastMessageBy?: string;
  employerUnreadCount: number;
  memberUnreadCount: number;
  // Status
  status: "active" | "archived";
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Notification Types
export type NotificationType =
  | "new_application"      // Employer receives when someone applies
  | "application_status"   // Member receives when status changes
  | "new_message"          // Both receive when new message arrives
  | "job_alert"            // Member receives matching job alert
  | "employer_approved"    // Employer receives when approved
  | "employer_rejected"    // Employer receives when rejected
  | "scholarship_status"   // Member receives scholarship updates
  | "system";              // System announcements

export interface Notification {
  id: string;
  userId: string;          // Who receives this notification
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  // Optional links for navigation
  link?: string;           // URL to navigate to when clicked
  // Related entity IDs for context
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedConversationId?: string;
  relatedEmployerId?: string;
  // Metadata
  createdAt?: Timestamp | null;
}


export type ShopListing = Vendor;

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
  trainingFormats: TrainingFormat[]; // empty = all formats

  // Platform Newsletter
  weeklyDigest: boolean;

  // Account Notifications (always on by default, can't fully disable)
  applicationUpdates: boolean; // job application status changes
  messageNotifications: boolean; // new messages

  // Metadata
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Email Campaign for admin-sent emails
export type EmailCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type EmailCampaignType = "announcement" | "newsletter" | "promotion" | "system";

export interface EmailCampaign {
  id: string;

  // Content
  name: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  textContent: string;

  // Targeting
  audienceType: "all" | "job_seekers" | "employers" | "vendors" | "custom";
  audienceFilters?: {
    roles?: string[];
    regions?: string[];
    registeredAfter?: Timestamp | null;
    registeredBefore?: Timestamp | null;
    hasApplied?: boolean;
    isActive?: boolean;
  };
  recipientCount?: number;

  // Schedule
  status: EmailCampaignStatus;
  scheduledAt?: Timestamp | null;
  sentAt?: Timestamp | null;

  // Stats
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };

  // Metadata
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Email log for tracking individual sends
export interface EmailLog {
  id: string;
  userId: string;
  email: string;

  // Email details
  type: "job_alert" | "conference_alert" | "powwow_alert" | "shop_alert" | "digest" | "campaign" | "transactional";
  subject: string;
  campaignId?: string;

  // Status
  status: "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";

  // Tracking
  openedAt?: Timestamp | null;
  clickedAt?: Timestamp | null;

  // Metadata
  createdAt: Timestamp | null;
}

// ============================================
// ADMIN PRODUCT MANAGEMENT
// ============================================

export type ProductCategory = "job" | "subscription" | "conference" | "vendor" | "custom";

export type ProductType =
  // Job products
  | "SINGLE"
  | "FEATURED"
  // Subscription products
  | "TIER1"
  | "TIER2"
  // Conference products
  | "CONFERENCE_STANDARD"
  | "CONFERENCE_FEATURED"
  // Vendor products
  | "VENDOR_MONTHLY"
  | "VENDOR_ANNUAL"
  // Custom
  | "CUSTOM";

export type ProductStatus = "active" | "expired" | "cancelled" | "pending";
export type PaymentMethod = "stripe" | "manual" | "free_grant";

export interface EmployerProduct {
  id: string;
  employerId: string;

  // Product classification
  category: ProductCategory;
  productType: ProductType;
  productName: string;

  // Financials
  price: number; // cents - retail price
  paidAmount: number; // cents - what they actually paid
  paymentMethod: PaymentMethod;
  stripePaymentId?: string;
  invoiceNumber?: string; // for manual payments

  // Timeline
  activatedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  status: ProductStatus;

  // Admin tracking
  grantedBy: string; // admin user ID who added it
  grantedByEmail?: string;
  grantReason?: string; // "Partner", "Sponsorship", "Promotion", etc.
  notes?: string;

  // Usage stats (varies by product type)
  stats: {
    // Job products
    jobsPosted?: number;
    jobsRemaining?: number | "unlimited";
    featuredJobsUsed?: number;
    featuredJobsRemaining?: number;

    // Conference products
    conferencesPosted?: number;
    conferencesRemaining?: number;

    // Vendor products
    vendorListingActive?: boolean;
  };

  // Metadata
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Product configuration for adding new products
export interface ProductConfig {
  category: ProductCategory;
  productType: ProductType;
  name: string;
  price: number; // cents
  duration: number; // days
  features: string[];
  // Default stats when product is granted
  defaultStats: EmployerProduct["stats"];
}

// ============================================
// TRAINING PROGRAMS
// ============================================

export type TrainingProgramStatus = "pending" | "approved" | "rejected";
export type TrainingFormat = "in-person" | "online" | "hybrid";
export type TrainingDuration = "hours" | "days" | "weeks" | "months" | "self-paced";

export interface TrainingProgram {
  id: string;

  // Organization/Provider
  organizationId: string; // References employers collection
  organizationName?: string; // Denormalized for display

  // Program Details
  title: string;
  description: string;
  shortDescription?: string; // For cards/previews

  // External Enrollment (external redirect only)
  enrollmentUrl: string; // Required - external provider URL
  providerName: string; // Name of training institution
  providerWebsite?: string;

  // Format & Duration
  format: TrainingFormat;
  duration?: string; // e.g., "6 weeks", "40 hours"
  durationType?: TrainingDuration;
  startDate?: Timestamp | string | null;
  endDate?: Timestamp | string | null;
  ongoing?: boolean; // If true, continuous enrollment

  // Location (for in-person/hybrid)
  location?: string;
  region?: NorthAmericanRegion;

  // Categorization
  category?: string; // e.g., "Technology", "Trades", "Healthcare"
  skills?: string[]; // Skills taught
  certificationOffered?: string;

  // Indigenous Focus
  indigenousFocused?: boolean;
  targetCommunities?: string[]; // Specific nations/communities

  // Cost & Funding
  cost?: string; // Display string, e.g., "Free", "$500", "Contact provider"
  fundingAvailable?: boolean;
  scholarshipInfo?: string;

  // Media
  imageUrl?: string;

  // Status & Approval (hybrid workflow)
  status: TrainingProgramStatus;
  featured: boolean; // Paid featuring
  active: boolean;

  // Analytics
  viewCount?: number;
  clickCount?: number; // Clicks to enrollment URL

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
}

// For tracking user interest/clicks (analytics)
export interface MemberTrainingInterest {
  id: string;
  userId: string;
  programId: string;
  programTitle?: string; // Denormalized
  organizationName?: string; // Denormalized
  clickedAt: Timestamp | null;
  enrollmentClicked: boolean; // Did they click through to provider?
}

// ============================================
// INDIGENOUS MARKETPLACE - SERVICES
// ============================================

export const SERVICE_CATEGORIES = [
  'Consulting',
  'Legal Services',
  'Accounting & Finance',
  'Marketing & Communications',
  'IT & Technology',
  'Design & Creative',
  'Construction & Trades',
  'Health & Wellness',
  'Education & Training',
  'Environmental Services',
  'Cultural Services',
  'Translation & Language',
  'Event Services',
  'Other Professional Services',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

export type ServiceStatus = 'draft' | 'pending' | 'active' | 'approved' | 'suspended';

export interface Service {
  id: string;
  vendorId: string; // Can be linked to a vendor or standalone
  userId: string; // Owner's user ID

  // Business Info
  businessName: string;
  slug: string; // URL-friendly identifier
  title: string; // Service title (e.g., "Indigenous Business Consulting")
  tagline?: string;
  description: string;
  category: ServiceCategory;

  // Location & Availability
  location?: string;
  region: NorthAmericanRegion;
  servesRemote: boolean; // Can serve clients remotely
  serviceAreas?: string[]; // Specific areas served

  // Contact & Links
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  bookingUrl?: string; // External booking/contact link

  // Media
  logoUrl?: string;
  coverImageUrl?: string;
  portfolioImages?: string[];

  // Indigenous Identity
  nation?: string;
  indigenousOwned: boolean;
  communityStory?: string;

  // Service Details
  services?: string[]; // List of specific services offered
  industries?: string[]; // Industries served
  certifications?: string[];
  yearsExperience?: number;

  // Pricing
  priceRange?: string; // e.g., "$100-$200/hr", "Contact for quote"
  freeConsultation?: boolean;

  // Status & Visibility
  status: ServiceStatus;
  featured: boolean;
  verified: boolean;

  // Analytics
  viewCount: number;
  contactClicks: number;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ============================================
// ORGANIZATION MODULES (Dashboard Overhaul)
// ============================================

// Organization capabilities (legacy - for backward compatibility)
export type OrganizationCapability = "employer" | "vendor" | "education";

// New module system (replaces binary employer/vendor mode)
export type OrganizationModule = 'hire' | 'sell' | 'educate' | 'host' | 'funding';

export const ORGANIZATION_MODULES = ['hire', 'sell', 'educate', 'host', 'funding'] as const;

export interface ModuleSettings {
  hire?: {
    enabled: boolean;
    setupComplete: boolean;
  };
  sell?: {
    enabled: boolean;
    setupComplete: boolean;
    vendorId?: string;
  };
  educate?: {
    enabled: boolean;
    setupComplete: boolean;
    schoolId?: string;
  };
  host?: {
    enabled: boolean;
    setupComplete: boolean;
  };
  funding?: {
    enabled: boolean;
    setupComplete: boolean;
  };
}

// Unified Inbox Types
export type InboxItemType = 'candidate_message' | 'customer_inquiry' | 'student_inquiry' | 'system';

export interface UnifiedInboxItem {
  id: string;
  type: InboxItemType;
  sourceId: string; // conversationId or inquiryId
  senderName: string;
  senderEmail?: string;
  senderAvatarUrl?: string;
  subject?: string;
  preview: string;
  isRead: boolean;
  status: 'new' | 'read' | 'replied' | 'archived';
  relatedEntity?: {
    type: 'job' | 'program' | 'product' | 'service' | 'scholarship';
    id: string;
    title: string;
  };
  createdAt: Timestamp | null;
  lastActivityAt?: Timestamp | null;
}

// Analytics Event Types
export type AnalyticsEventType =
  | 'profile_view'
  | 'outbound_link_click'
  | 'inquiry_submitted'
  | 'application_submitted'
  | 'entity_created'
  | 'entity_published';

export type OutboundLinkType = 'website' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'booking' | 'phone' | 'email' | 'other';

export interface OutboundClickEvent {
  id: string;
  organizationId: string;
  vendorId?: string;
  offeringId?: string;
  linkType: OutboundLinkType;
  targetUrl: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  createdAt: Timestamp | null;
}

export interface ClickStats {
  total: number;
  byLinkType: Record<OutboundLinkType, number>;
  byDay: { date: string; count: number }[];
}

export interface ViewStats {
  total: number;
  byDay: { date: string; count: number }[];
}

// Unified Offering Type (wraps products and services)
export type OfferingType = 'product' | 'service';

export interface UnifiedOffering {
  id: string;
  type: OfferingType;
  userId: string;
  vendorId?: string;

  // Common fields
  name: string;
  slug?: string;
  description: string;
  category: string;

  // Pricing
  price?: number;
  priceDisplay?: string;

  // Media
  imageUrl?: string;
  images?: string[];

  // Availability
  active: boolean;
  featured: boolean;

  // Service-specific
  servesRemote?: boolean;
  bookingUrl?: string;

  // Product-specific
  inStock?: boolean;
  madeToOrder?: boolean;

  // Analytics
  viewCount: number;
  contactClicks: number;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ============================================
// EDUCATION PILLAR - Schools, Programs, Events
// ============================================

// School types
export const SCHOOL_TYPES = [
  "university",
  "college",
  "polytechnic",
  "tribal_college",
  "training_provider"
] as const;

export type SchoolType = typeof SCHOOL_TYPES[number];

// Program levels
export const PROGRAM_LEVELS = [
  "certificate",
  "diploma",
  "bachelor",
  "master",
  "doctorate",
  "microcredential",
  "apprenticeship"
] as const;

export type ProgramLevel = typeof PROGRAM_LEVELS[number];

// Program delivery methods
export type ProgramDelivery = "in-person" | "online" | "hybrid";
export type ProgramDeliveryMethod = ProgramDelivery; // Alias

// Program status
export type ProgramStatus = "draft" | "pending" | "active" | "approved" | "archived";

// Program categories
export const PROGRAM_CATEGORIES = [
  "Business & Management",
  "Healthcare & Nursing",
  "Trades & Industrial",
  "Technology & IT",
  "Indigenous Studies",
  "Social Work & Community",
  "Education & Teaching",
  "Arts & Design",
  "Sciences",
  "Environment & Natural Resources",
  "Engineering",
  "Law & Justice",
  "Agriculture",
  "Hospitality & Tourism",
  "Other",
] as const;

export type ProgramCategory = typeof PROGRAM_CATEGORIES[number];

// Education event types
export type EducationEventType =
  | "open_house"
  | "info_session"
  | "campus_tour"
  | "webinar"
  | "career_fair"
  | "application_workshop"
  | "orientation"
  | "other";

export type EducationEventFormat = "online" | "in-person" | "hybrid";

// Education subscription tiers
export type EducationTier = "starter" | "growth" | "partner" | "enterprise";

// School campus
export interface SchoolCampus {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  isMain: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Indigenous services offered by a school
export interface IndigenousServices {
  studentCentre?: {
    name: string;
    description?: string;
  };
  elderInResidence?: boolean;
  culturalCoordinators?: boolean;
  academicCoaches?: boolean;
  learningSpecialists?: boolean;
  wellnessCoaches?: boolean;
  psychologists?: boolean;
  languagePrograms?: string[]; // ['Cree', 'Ojibwe', etc.]
  culturalProgramming?: boolean;
  ceremonySpace?: boolean;
  communitySupports?: string[]; // ['housing', 'childcare', 'transportation']
}

// School stats
export interface SchoolStats {
  indigenousStudentPercentage?: number;
  indigenousStaffPercentage?: number;
  totalPrograms?: number;
  totalEnrollment?: number;
  alumniCount?: string;
  nationsRepresented?: number;
  employerPartners?: number;
  viewsCount?: number;
}

// School verification info
export interface SchoolVerification {
  isVerified?: boolean;
  verifiedDate?: Timestamp | null;
  verifiedBy?: string;
  indigenousControlled: boolean; // First Nation governed?
  accreditation?: string[];
}

// School recruitment team member
export interface SchoolRecruitmentContact {
  name: string;
  title: string;
  email: string;
  phone?: string;
}

// School contact info
export interface SchoolContact {
  admissionsEmail?: string;
  admissionsPhone?: string;
  email?: string; // Alias
  phone?: string; // Alias
  indigenousServicesEmail?: string;
  recruitmentTeam?: SchoolRecruitmentContact[];
}

// School profile (linked to an employer/organization)
export interface School {
  id: string;
  employerId: string; // Links to employers collection (organization)

  // Basic Info
  name: string;
  shortName?: string;
  slug: string; // URL-friendly name
  type: SchoolType;
  established?: number;
  website?: string;
  description?: string;

  // Head Office Location
  headOffice?: {
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    reserveName?: string; // If on reserve land
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Campuses
  campuses?: SchoolCampus[];

  // Indigenous Services (key differentiator)
  indigenousServices?: IndigenousServices;

  // Stats
  stats?: SchoolStats;

  // Verification
  verification?: SchoolVerification;

  // Media
  logoUrl?: string;
  bannerUrl?: string;
  photos?: string[];
  videoTourUrl?: string;

  // Contact
  contact?: SchoolContact;

  // Social Links
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };

  // Subscription
  subscription?: {
    tier: EducationTier;
    startedAt?: Timestamp | null;
    expiresAt?: Timestamp | null;
    isIndigenousDiscount?: boolean;
  };

  // Metadata
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastScrapedAt?: Timestamp | null;
  isPublished: boolean;

  // Convenience properties (denormalized for easier access)
  isVerified?: boolean;
  location?: {
    city?: string;
    province?: string;
    address?: string;
    postalCode?: string;
  };
  indigenousFocused?: boolean;
  viewCount?: number;

  // Status for approval workflow
  status?: "pending" | "approved" | "rejected" | "deleted";

  // Claim status for pre-populated schools
  claimStatus?: "unclaimed" | "pending_claim" | "claimed";
  claimedBy?: string; // employerId who claimed
  claimedAt?: Timestamp | null;
}

// Program intake dates
export interface ProgramIntake {
  startDate: Timestamp | string | null;
  applicationDeadline?: Timestamp | string | null;
  isAccepting: boolean;
}

// Program tuition
export interface ProgramTuition {
  domestic?: number;
  international?: number;
  per: "year" | "program" | "semester";
}

// Program admission requirements
export interface ProgramAdmissionRequirements {
  education?: string; // 'Grade 12', 'Adult 12', etc.
  prerequisites?: string[];
  englishRequirement?: string;
  other?: string[];
}

// Program career outcomes
export interface ProgramCareerOutcomes {
  description?: string;
  occupations?: string[];
  salaryRange?: {
    min: number;
    max: number;
  };
  employmentRate?: number;
}

// Program transfer pathway
export interface ProgramTransferPathway {
  institution: string;
  program: string;
  creditsTransferred?: number;
}

// Program community stats (social proof)
export interface ProgramCommunityStats {
  totalEnrolled?: number;
  totalGraduated?: number;
  connectionsCount?: number; // IOPPS members in this program
}

// Education Program (academic programs offered by schools)
export interface EducationProgram {
  id: string;
  schoolId: string;
  schoolName?: string; // Denormalized for display

  // Basic Info
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;

  // Classification
  category: ProgramCategory;
  subcategory?: string;
  level: ProgramLevel;

  // Delivery
  deliveryMethod: ProgramDelivery;
  delivery?: string; // Alias
  duration?: {
    value: number;
    unit: "weeks" | "months" | "years";
  };
  fullTime: boolean;
  partTimeAvailable?: boolean;

  // Location
  campuses?: string[]; // Which campus IDs offer this
  communityDelivery?: boolean; // Offered in communities?

  // Dates
  intakeDates?: ProgramIntake[];

  // Costs
  tuition?: ProgramTuition;
  additionalFees?: {
    name: string;
    amount: number;
  }[];
  totalCostEstimate?: number;

  // Requirements
  admissionRequirements?: ProgramAdmissionRequirements;

  // Outcomes
  careerOutcomes?: ProgramCareerOutcomes;

  // Pathways
  transferPathways?: ProgramTransferPathway[];

  // Indigenous Focus
  indigenousFocused?: boolean;
  indigenousContentPercentage?: number;

  // Linked scholarships
  scholarshipIds?: string[];

  // Social proof (calculated)
  communityStats?: ProgramCommunityStats;

  // Media
  imageUrl?: string;

  // Metadata
  sourceUrl?: string; // Original URL on school website
  applicationUrl?: string; // For applying
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  isPublished: boolean;

  // Analytics
  viewsCount?: number;
  viewCount?: number; // Alias
  savesCount?: number;
  inquiryCount?: number;

  // Display
  featured?: boolean;
  credential?: string; // Alias for level display
}

// Education Event (open houses, info sessions, campus tours)
export interface EducationEvent {
  id: string;
  schoolId: string;
  schoolName?: string; // Denormalized

  // Basic Info
  name: string;
  title?: string; // Alias
  description: string;
  type: EducationEventType;
  eventType?: string; // Alias

  // Timing
  startDatetime: Timestamp | Date | string | null;
  startDate?: Timestamp | Date | string | null; // Alias
  endDatetime?: Timestamp | Date | string | null;
  endDate?: Timestamp | Date | string | null; // Alias
  timezone?: string;

  // Format
  format: EducationEventFormat;
  location?: string; // If in-person
  virtualLink?: string; // If virtual

  // Registration
  registrationUrl?: string;
  registrationRequired: boolean;
  capacity?: number;

  // Programs featured
  featuredProgramIds?: string[];

  // Social
  attendeeCount?: number;
  rsvpMemberIds?: string[]; // Member IDs who RSVP'd

  // Media
  imageUrl?: string;

  // Metadata
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  isPublished: boolean;

  // Additional location fields
  venue?: string;
  city?: string;
  province?: string;
  viewCount?: number;
}

// Extended Scholarship for Education pillar
export type ScholarshipProviderType = "school" | "government" | "organization" | "private";
export type IndigenousStatus = "first_nations" | "metis" | "inuit" | "all_indigenous" | "any";

export interface ScholarshipEligibility {
  indigenousStatus?: IndigenousStatus[];
  nations?: string[]; // Specific nations if restricted
  provinces?: string[];
  studyLevel?: ProgramLevel[];
  fieldsOfStudy?: ProgramCategory[];
  programIds?: string[]; // Specific programs if restricted
  schoolIds?: string[]; // Specific schools if restricted
  gpaRequirement?: number;
  financialNeed?: boolean;
  otherRequirements?: string[];
}

export interface ScholarshipAmount {
  value: number;
  type: "fixed" | "range" | "variable" | "full_tuition";
  maxValue?: number; // If range
  currency?: string;
}

export interface ScholarshipCommunityStats {
  recipientsCount?: number; // IOPPS members who received this
  connectionsReceived?: number;
}

// Extended scholarship (adds to existing Scholarship interface via intersection)
export interface ExtendedScholarship extends Omit<Scholarship, 'amount'> {
  // Extended source info
  providerType?: ScholarshipProviderType;
  schoolId?: string; // If school-provided

  // Extended amount (structured)
  amountStructured?: ScholarshipAmount;

  // Extended eligibility
  eligibility?: ScholarshipEligibility;

  // Application
  applicationOpen?: Timestamp | string | null;
  isRecurring?: boolean; // Annual?
  applicationProcess?: string;

  // Social proof
  communityStats?: ScholarshipCommunityStats;

  // Source tracking
  sourceUrl?: string;
}

// Member education history entry
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

// Member education interests
export interface MemberEducationInterests {
  seekingEducation: boolean;
  educationLevelInterested?: ProgramLevel[];
  fieldsInterested?: ProgramCategory[];
  preferredDelivery?: ProgramDelivery[];
  preferredLocations?: string[];
  timeline?: "immediately" | "next_6_months" | "next_year" | "exploring";
}

// Member saved education items
export interface SavedProgram {
  id: string;
  programId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  program?: EducationProgram | null;
}

export interface SavedScholarship {
  id: string;
  scholarshipId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  scholarship?: Scholarship | ExtendedScholarship | null;
}

export interface SavedSchool {
  id: string;
  schoolId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  school?: School | null;
}

// Event RSVP
export interface EventRSVP {
  eventId: string;
  eventType: "education" | "community" | "conference";
  rsvpDate: Timestamp | null;
  status: "going" | "maybe" | "not_going";
}

// Student inquiry to school
export interface StudentInquiry {
  id: string;
  schoolId: string;
  memberId: string;
  memberEmail?: string;
  studentEmail?: string; // Alias
  memberName?: string;
  studentName?: string; // Alias

  // Inquiry details
  subject: string;
  message: string;
  programId?: string; // If about a specific program

  // Status
  status: "new" | "read" | "replied" | "responded" | "archived";
  repliedAt?: Timestamp | null;
  repliedBy?: string;

  // Metadata
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;

  // Additional fields
  interestedInPrograms?: string[];
  intendedStartDate?: string;
  educationLevel?: string;
}

// Alias for backward compatibility
export type SchoolInquiry = StudentInquiry;

// Input type for creating student inquiries
export type StudentInquiryInput = Omit<StudentInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repliedAt' | 'repliedBy'> & {
  interestedInPrograms?: string[];
};

// Inquiry status type
export type InquiryStatus = "new" | "read" | "replied" | "responded" | "archived";

// Import job for AI scraping
export type ImportJobStatus = "pending" | "crawling" | "extracting" | "review" | "completed" | "failed";

export interface ImportJob {
  id: string;
  employerId: string;
  websiteUrl: string;

  status: ImportJobStatus;

  progress?: {
    pagesCrawled: number;
    pagesTotal: number;
    currentStep: string;
  };

  extractedData?: {
    institution?: Partial<School>;
    programs?: Partial<EducationProgram>[];
    scholarships?: Partial<Scholarship>[];
    needsReview?: string[]; // Items with low confidence
  };

  validationErrors?: string[];

  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;

  createdBy: string;
  createdAt?: Timestamp | null;
}

// Education settings for organizations (stored in employer profile)
export interface EducationSettings {
  isEnabled: boolean;
  schoolId?: string; // Links to schools collection
  tier?: EducationTier;
  programsCount?: number;
  scholarshipsCount?: number;
}

// ============================================
// BUSINESS FUNDING / GRANTS
// ============================================

export type BusinessGrantType =
  | "startup"
  | "expansion"
  | "equipment"
  | "training"
  | "export"
  | "innovation"
  | "green"
  | "women"
  | "youth"
  | "general";

export type BusinessGrantStatus = "active" | "closed" | "upcoming";

export interface BusinessGrant {
  id: string;

  // Basic Info
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;

  // Provider Info
  provider: string;
  providerLogo?: string;
  providerWebsite?: string;

  // Grant Details
  grantType: BusinessGrantType;
  amount?: {
    min?: number;
    max?: number;
    display?: string; // e.g., "Up to $50,000" or "Varies"
  };

  // Eligibility
  eligibility: {
    businessTypes?: string[]; // e.g., ["sole proprietorship", "corporation"]
    provinces?: NorthAmericanRegion[];
    indigenousOwned?: boolean;
    womenOwned?: boolean;
    youthOwned?: boolean;
    minYearsInBusiness?: number;
    industries?: string[];
    requirements?: string[];
  };

  // Dates
  deadline?: Timestamp | Date | string | null;
  openDate?: Timestamp | Date | string | null;

  // Application
  applicationUrl?: string;
  applicationProcess?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Status & Visibility
  status: BusinessGrantStatus;
  featured: boolean;

  // Metadata
  viewCount?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdBy?: string;
}

// ============================================
// SOCIAL HUB TYPES
// ============================================

export type AuthorType = 'member' | 'organization' | 'system';
export type PostType = 'status' | 'share_job' | 'share_scholarship' | 'share_event' | 'share_product' | 'article' | 'poll';
export type PostVisibility = 'public' | 'connections' | 'private';

export interface Post {
  id: string;
  authorId: string;
  authorType: AuthorType;
  authorName: string;
  authorAvatarUrl?: string;
  authorTagline?: string;
  content: string;
  type: PostType;
  visibility: PostVisibility;
  mediaUrls?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  referenceId?: string; // ID of the shared entity (job, scholarship, etc.)
  referenceData?: any; // Cached data of the shared entity for display
  isEdited?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorType: AuthorType;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  likesCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  requesterName?: string;
  requesterAvatarUrl?: string;
  requesterTagline?: string;
  recipientName?: string;
  recipientAvatarUrl?: string;
  recipientTagline?: string;
  connectedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'post' | 'comment' | 'like' | 'share' | 'connection';
  referenceId: string;
  content?: string;
  createdAt: Timestamp;
}

// ============================================
// TEAM ACTIVITY LOG
// ============================================

export const TEAM_ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'published',
  'unpublished',
  'duplicated',
  'archived',
] as const;

export type TeamActivityAction = typeof TEAM_ACTIVITY_ACTIONS[number];

export const TEAM_ACTIVITY_RESOURCES = [
  'job',
  'training_program',
  'event',
  'conference',
  'product',
  'service',
  'scholarship',
  'grant',
  'team_member',
  'settings',
] as const;

export type TeamActivityResource = typeof TEAM_ACTIVITY_RESOURCES[number];

export interface TeamActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string;
  action: TeamActivityAction;
  resource: TeamActivityResource;
  resourceId: string;
  resourceTitle: string;
  details?: Record<string, unknown>; // Additional context (e.g., what fields changed)
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp | null;
}

// ============================================
// UNIVERSAL ORGANIZATION PROFILE
// ============================================

// Organization types - what kind of entity is this?
export const ORG_TYPES = [
  'EMPLOYER',
  'INDIGENOUS_BUSINESS',
  'SCHOOL',
  'NONPROFIT',
  'GOVERNMENT',
  'OTHER',
] as const;

export type OrgType = typeof ORG_TYPES[number];

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  EMPLOYER: 'Employer',
  INDIGENOUS_BUSINESS: 'Indigenous Business',
  SCHOOL: 'School / College',
  NONPROFIT: 'Non-Profit',
  GOVERNMENT: 'Government',
  OTHER: 'Organization',
};

// Organization publication status
export type OrganizationStatus = 'DRAFT' | 'PUBLISHED';

// Extended social links with all platforms
export interface ExtendedSocialLinks {
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
}

// Primary CTA type for directory cards (computed from enabled modules)
export type PrimaryCTAType = 'JOBS' | 'OFFERINGS' | 'PROGRAMS' | 'EVENTS' | 'FUNDING' | 'WEBSITE';

// Universal Organization Profile - extends EmployerProfile with directory-specific fields
export interface OrganizationProfile extends Omit<EmployerProfile, 'socialLinks'> {
  // New universal fields
  slug: string;
  orgType: OrgType;
  badgePreference?: OrgType | 'AUTO';  // 'AUTO' = derive from modules

  // Publication status
  publicationStatus: OrganizationStatus;
  directoryVisible: boolean;
  publishedAt?: Timestamp | null;

  // Enhanced location
  province?: string;
  city?: string;
  nation?: string; // Indigenous nation/community
  community?: string; // Specific community

  // Enhanced content
  tagline?: string;
  story?: string; // Longer narrative content

  // Categories/tags for filtering
  categories?: string[];
  tags?: string[];

  // Extended social links
  links?: ExtendedSocialLinks;

  // Keep legacy socialLinks for backward compatibility
  socialLinks?: SocialLinks;

  // Soft delete fields
  deletedAt?: Timestamp | null;
  deletedBy?: string;
  deleteReason?: string | null;
}

// Directory Index Entry - denormalized for fast queries
export interface DirectoryEntry {
  id: string;
  orgId: string;

  // Basic info for display
  name: string;
  slug: string;
  orgType: OrgType;
  tagline?: string;

  // Location
  province?: string;
  city?: string;

  // Categorization
  categories?: string[];
  tags?: string[];

  // Modules enabled
  enabledModules: OrganizationModule[];

  // Computed primary CTA
  primaryCTAType: PrimaryCTAType;

  // Media
  logoUrl?: string;

  // Indigenous-specific
  isIndigenousOwned?: boolean;
  nation?: string;

  // Content counts for filtering/display
  counts: {
    jobsCount: number;
    programsCount: number;
    scholarshipsCount: number;
    offeringsCount: number;
    eventsCount: number;
    fundingCount: number;
  };

  // Status
  directoryVisible: boolean;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Profile view analytics event
export interface ProfileViewEvent {
  id: string;
  organizationId: string;
  slug: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  createdAt: Timestamp | null;
}

// Filter options for directory
export interface DirectoryFilters {
  search?: string;
  orgType?: OrgType | OrgType[];
  province?: string;
  city?: string;
  categories?: string[];
  tags?: string[];
  modules?: OrganizationModule[];
  isIndigenousOwned?: boolean;
}

// Sort options for directory
export type DirectorySortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest';

// Paginated directory results
export interface DirectoryResults {
  entries: DirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
