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
  // Admin Bypass - Free posting without payment (legacy fields for backward compatibility)
  freePostingEnabled?: boolean;
  freePostingReason?: string;
  freePostingGrantedAt?: Timestamp | null;
  freePostingGrantedBy?: string;
  // Enhanced free posting grant
  freePostingGrant?: FreePostingGrant;
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
  // RSS Import fields
  importedFrom?: string; // RSS feed ID this job came from
  originalUrl?: string; // Original job listing URL
  originalApplicationLink?: string; // Original application URL (without UTM)
  noIndex?: boolean; // If true, tell search engines not to index
  expiredAt?: Timestamp | Date | null; // When job was auto-expired
  expirationReason?: string; // Why job was expired (e.g., "Removed from feed")
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
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  viewsCount?: number;

  // Rich Media
  imageUrl?: string;
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
  coverLetter?: string; // Legacy text field
  note?: string;

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
  imageUrl?: string;
  imagePath?: string;
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
