import type { Timestamp } from "firebase/firestore";

export type UserRole = "community" | "employer" | "moderator" | "admin";
export type EmployerStatus = "pending" | "approved" | "rejected";

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
  createdAt?: Timestamp | null;
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

export interface EmployerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  website?: string;
  location?: string;
  logoUrl?: string;
  interviews?: Interview[];
  status?: EmployerStatus;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
  rejectionReason?: string;
  subscription?: EmployerSubscription;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
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
  // Payment fields
  paymentStatus?: "paid" | "pending" | "failed";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
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

  // Payment fields
  featured?: boolean;
  paymentStatus?: "paid" | "pending" | "failed";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  viewsCount?: number;

  // Rich Media
  bannerImageUrl?: string;
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
  description: string;
  amount?: string;
  deadline?: Timestamp | string | null;
  level: string;
  region?: string;
  type: string;
  createdAt?: Timestamp | null;
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
  'Cultural Gathering',
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
