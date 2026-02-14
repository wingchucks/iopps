/**
 * Organization and employer types for the IOPPS platform.
 */

import type { FirestoreTimestamp, SocialLinks, ExtendedSocialLinks } from './common';
import type { Interview, CompanyVideo } from './content';

// ============================================
// EMPLOYER & ORGANIZATION ENUMS
// ============================================

export type EmployerStatus = "incomplete" | "pending" | "approved" | "rejected" | "deleted";

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

// ============================================
// TRC ALIGNMENT
// ============================================

export interface TRCAlignment {
  hasIndigenousHiringStrategy: boolean;
  leadershipTrainingComplete: boolean;
  isIndigenousOwned: boolean;
  commitmentStatement: string; // Max 140 chars
}

// ============================================
// INDIGENOUS VERIFICATION
// ============================================

export type IndigenousVerificationStatus = "not_requested" | "pending" | "approved" | "rejected";

export interface IndigenousVerification {
  status: IndigenousVerificationStatus;
  isIndigenousOwned?: boolean;
  isIndigenousLed?: boolean;
  nationAffiliation?: string;
  certifications?: string[];
  requestedAt?: FirestoreTimestamp | null;
  requestNotes?: string;
  reviewedAt?: FirestoreTimestamp | null;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

// ============================================
// TEAM ACCESS
// ============================================

export type TeamRole = "admin" | "editor" | "viewer";

export interface TeamMember {
  id: string; // User's Firebase UID
  email: string;
  displayName?: string;
  role: TeamRole;
  addedBy: string;
  addedAt: FirestoreTimestamp | null;
  lastAccessedAt?: FirestoreTimestamp | null;
}

export type TeamInvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface TeamInvitation {
  id: string;
  employerId: string;
  organizationName: string;
  invitedEmail: string;
  invitedBy: string;
  invitedByName?: string;
  role: TeamRole;
  status: TeamInvitationStatus;
  token: string;
  expiresAt: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp | null;
  acceptedAt?: FirestoreTimestamp | null;
}

export interface TeamSettings {
  allowInvitations: boolean;
  defaultRole: TeamRole;
  maxTeamSize?: number;
}

// ============================================
// SUBSCRIPTION & PAYMENTS
// ============================================

export interface EmployerSubscription {
  active: boolean;
  tier: string;
  purchasedAt?: FirestoreTimestamp | Date | null;
  expiresAt?: FirestoreTimestamp | Date | null;
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

export type VisibilityReason =
  | 'grandfathered'
  | 'subscription'
  | 'vendor'
  | 'featured_job'
  | 'job'
  | 'expired';

export type VisibilitySource = 'subscription' | 'vendor' | 'featured_job' | 'job' | 'none';

export interface VisibilitySourceDetails {
  maxSource: VisibilitySource;
  maxUntil?: FirestoreTimestamp | Date | null;
  subscriptionUntil?: FirestoreTimestamp | Date | null;
  vendorUntil?: FirestoreTimestamp | Date | null;
  jobsMaxUntil?: FirestoreTimestamp | Date | null;
  featuredJobsMaxUntil?: FirestoreTimestamp | Date | null;
  eligibleJobsCount?: number;
}

// ============================================
// FREE POSTING GRANTS
// ============================================

export type GrantType = "single" | "featured" | "tier1" | "tier2";

export interface FreePostingGrant {
  enabled: boolean;
  grantType: GrantType;
  reason?: string;
  jobCredits: number;
  jobCreditsUsed: number;
  featuredCredits: number;
  featuredCreditsUsed: number;
  unlimitedPosts: boolean;
  grantedAt: FirestoreTimestamp | null;
  expiresAt: FirestoreTimestamp | null;
  grantedBy: string;
}

// ============================================
// EMPLOYER NOTIFICATION PREFERENCES
// ============================================

export interface EmployerNotificationPreferences {
  // Application notifications
  newApplications: boolean;
  applicationStatusChanges: boolean;
  // Job notifications
  jobExpiring: boolean;
  scheduledJobPublished: boolean;
  // Training program notifications
  trainingProgramExpiring?: boolean;
  trainingProgramPublished?: boolean;
  trainingRegistrations?: boolean;
  // Event notifications
  eventReminders?: boolean;
  eventPublished?: boolean;
  eventRegistrations?: boolean;
  // Product/Service notifications
  productServiceExpiring?: boolean;
  productServicePublished?: boolean;
  productServiceInquiries?: boolean;
  // Scholarship/Grant notifications
  scholarshipGrantExpiring?: boolean;
  scholarshipGrantPublished?: boolean;
  scholarshipApplications?: boolean;
  // Team notifications
  teamInvitations: boolean;
  teamActivity: boolean;
  // Digest notifications
  weeklyDigest: boolean;
  dailyActivitySummary?: boolean;
  // Marketing
  marketingEmails: boolean;
}

// ============================================
// ORGANIZATION MODULES
// ============================================

export type OrganizationCapability = "employer" | "vendor" | "education";

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

// ============================================
// EDUCATION SETTINGS (stored in employer profile)
// ============================================

export type EducationTier = "starter" | "growth" | "partner" | "enterprise";

export interface EducationSettings {
  isEnabled: boolean;
  schoolId?: string;
  tier?: EducationTier;
  programsCount?: number;
  scholarshipsCount?: number;
}

// ============================================
// EMPLOYER PROFILE
// ============================================

export interface EmployerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  website?: string;
  location?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: SocialLinks;
  industry?: IndustryType;
  companySize?: CompanySize;
  foundedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  // Video content
  companyIntroVideo?: CompanyVideo;
  interviews?: Interview[];
  status?: EmployerStatus;
  publicationStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';
  // Approval tracking
  approvedAt?: FirestoreTimestamp | null;
  approvedBy?: string;
  rejectionReason?: string;
  submittedForReviewAt?: FirestoreTimestamp | null;
  resubmittedAt?: FirestoreTimestamp | null;
  subscription?: EmployerSubscription;
  vendorSubscription?: {
    active: boolean;
    vendorId: string;
    expiresAt?: FirestoreTimestamp | Date | null;
  };
  // Directory Visibility (engagement-based) - SERVER-WRITTEN ONLY
  isGrandfathered?: boolean;
  isDirectoryVisible?: boolean;
  directoryVisibleUntil?: FirestoreTimestamp | null;
  visibilityReason?: VisibilityReason;
  visibilityComputedAt?: FirestoreTimestamp | null;
  visibilitySourceDetails?: VisibilitySourceDetails;
  // Admin Bypass
  freePostingEnabled?: boolean;
  freePostingReason?: string;
  freePostingGrantedAt?: FirestoreTimestamp | null;
  freePostingGrantedBy?: string;
  freePostingGrant?: FreePostingGrant;
  // Job credits
  jobCredits?: number;
  lastCreditPurchase?: FirestoreTimestamp | null;
  // Capabilities & Modules
  capabilities?: OrganizationCapability[];
  enabledModules?: OrganizationModule[];
  moduleSettings?: ModuleSettings;
  lastActiveModule?: OrganizationModule;
  educationSettings?: EducationSettings;
  // TRC Alignment
  trcAlignment?: TRCAlignment;
  // Indigenous Verification
  indigenousVerification?: IndigenousVerification;
  // Team Access
  teamMembers?: TeamMember[];
  teamMemberIds?: string[];
  teamSettings?: TeamSettings;
  // Notification Preferences
  notificationPreferences?: EmployerNotificationPreferences;
  // Engagement counters
  jobCount?: number;
  followerCount?: number;
  profileViews?: number;
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}

// ============================================
// UNIVERSAL ORGANIZATION PROFILE
// ============================================

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

export type OrganizationStatus = 'DRAFT' | 'PUBLISHED';

export type PrimaryCTAType = 'JOBS' | 'OFFERINGS' | 'PROGRAMS' | 'EVENTS' | 'FUNDING' | 'WEBSITE';

/** Universal Organization Profile - extends EmployerProfile with directory-specific fields */
export interface OrganizationProfile extends Omit<EmployerProfile, 'socialLinks'> {
  // New universal fields
  slug: string;
  orgType: OrgType;
  badgePreference?: OrgType | 'AUTO';
  // Publication status
  publicationStatus: OrganizationStatus;
  directoryVisible: boolean;
  directoryVisibleUntil?: FirestoreTimestamp | null;
  isGrandfathered?: boolean;
  publishedAt?: FirestoreTimestamp | null;
  // Enhanced location
  province?: string;
  city?: string;
  nation?: string;
  community?: string;
  // Enhanced content
  tagline?: string;
  story?: string;
  introVideoUrl?: string | null;
  // Categories/tags for filtering
  categories?: string[];
  tags?: string[];
  // Extended social links
  links?: ExtendedSocialLinks;
  // Keep legacy socialLinks for backward compatibility
  socialLinks?: SocialLinks;
  // Onboarding fields
  territory?: string;
  size?: string;
  yearEstablished?: number;
  sector?: string;
  onboardingComplete?: boolean;
  // Soft delete fields
  deletedAt?: FirestoreTimestamp | null;
  deletedBy?: string;
  deleteReason?: string | null;
}

// ============================================
// DIRECTORY INDEX
// ============================================

export interface DirectoryEntry {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  orgType: OrgType;
  tagline?: string;
  province?: string;
  city?: string;
  categories?: string[];
  tags?: string[];
  enabledModules: OrganizationModule[];
  primaryCTAType: PrimaryCTAType;
  logoUrl?: string;
  isIndigenousOwned?: boolean;
  nation?: string;
  counts: {
    jobsCount: number;
    programsCount: number;
    scholarshipsCount: number;
    offeringsCount: number;
    eventsCount: number;
    fundingCount: number;
  };
  directoryVisible: boolean;
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

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

export type DirectorySortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest';

export interface DirectoryResults {
  entries: DirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: FirestoreTimestamp | null;
}

// ============================================
// ADMIN PRODUCT MANAGEMENT
// ============================================

export type ProductCategory = "job" | "subscription" | "conference" | "vendor" | "custom";

export type ProductType =
  | "SINGLE"
  | "FEATURED"
  | "TIER1"
  | "TIER2"
  | "CONFERENCE_STANDARD"
  | "CONFERENCE_FEATURED"
  | "VENDOR_MONTHLY"
  | "VENDOR_ANNUAL"
  | "CUSTOM";

export type ProductStatus = "active" | "expired" | "cancelled" | "pending";
export type PaymentMethod = "stripe" | "manual" | "free_grant";

export interface EmployerProduct {
  id: string;
  employerId: string;
  category: ProductCategory;
  productType: ProductType;
  productName: string;
  price: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  stripePaymentId?: string;
  invoiceNumber?: string;
  activatedAt: FirestoreTimestamp | null;
  expiresAt: FirestoreTimestamp | null;
  status: ProductStatus;
  grantedBy: string;
  grantedByEmail?: string;
  grantReason?: string;
  notes?: string;
  stats: {
    jobsPosted?: number;
    jobsRemaining?: number | "unlimited";
    featuredJobsUsed?: number;
    featuredJobsRemaining?: number;
    conferencesPosted?: number;
    conferencesRemaining?: number;
    vendorListingActive?: boolean;
  };
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

export interface ProductConfig {
  category: ProductCategory;
  productType: ProductType;
  name: string;
  price: number;
  duration: number;
  features: string[];
  defaultStats: EmployerProduct["stats"];
}

// ============================================
// PROFILE VIEW ANALYTICS
// ============================================

export interface ProfileViewEvent {
  id: string;
  organizationId: string;
  slug: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  createdAt: FirestoreTimestamp | null;
}

// ============================================
// PLATFORM SETTINGS
// ============================================

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
  updatedAt?: FirestoreTimestamp | null;
  updatedBy?: string;
}
