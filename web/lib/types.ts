// ============================================================
// IOPPS.ca — Core Type Definitions (Master Spec v1.2)
// ============================================================

// ---------- Auth & Users ----------
export type AccountType = "community_member" | "organization";
export type UserRole = "member" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  accountType: AccountType;
  role: UserRole;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL: string | null;
  headline: string; // e.g. "Registered Nurse"
  nation: string; // Nation/Band/Community
  province: string;
  city: string;
  bio: string;
  skills: string[]; // max 3
  interests: Interest[];
  resumeURL: string | null;
  emailDigest: {
    frequency: "daily" | "weekly" | "off";
    categories: Record<ContentType, boolean>;
    lastSentAt: FirebaseTimestamp | null;
    unsubscribedAt: FirebaseTimestamp | null;
  };
  profileComplete: boolean;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  lastLoginAt: FirebaseTimestamp;
  disabled: boolean;
}

export type Interest = "jobs" | "events" | "scholarships" | "businesses" | "schools" | "livestreams";

// ---------- Organizations ----------
export type OrgType =
  | "employer"
  | "school"
  | "business"
  | "band_council"
  | "nonprofit";

export type VerificationStatus = "unverified" | "verified";
export type TeamRole = "admin" | "member";

export type SubscriptionTier = "none" | "tier1" | "tier2" | "school";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  primaryType: OrgType;
  secondaryType: OrgType | null;
  logoURL: string | null;
  industry: string;
  size: string; // e.g. "1-10", "11-50", "51-200", "201-500", "500+"
  province: string;
  city: string;
  address: string;
  website: string;
  description: string;
  indigenousOwned: boolean;
  indigenousOwnedVerified: boolean;
  verification: VerificationStatus;
  subscription: {
    tier: SubscriptionTier;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: FirebaseTimestamp | null;
    featuredJobsUsed: number;
    featuredJobsTotal: number;
    featuredProgramsUsed: number;
    featuredProgramsTotal: number;
    promotionPostsUsed: number;
    promotionPostsTotal: number;
    jobPostsUsed: number;
    jobPostsLimit: number | null; // null = unlimited
  };
  feedSync: {
    enabled: boolean;
    url: string;
    type: "oracle-hcm" | "adp-workforce" | "dayforce" | "generic" | null;
    lastSync: FirebaseTimestamp | null;
    jobCount: number;
    credentials: string | null;
  };
  teamMemberIds: string[];
  teamMembers: { uid: string; role: TeamRole; email: string }[];
  ownerUid: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  disabled: boolean;
}

// ---------- Unified Posts ----------
export type ContentType =
  | "job"
  | "event"
  | "scholarship"
  | "business"
  | "program"
  | "livestream"
  | "story"
  | "promotion";

export type PostStatus = "draft" | "active" | "expired" | "hidden";
export type JobSource = "manual" | "feed-sync";
export type EmploymentType = "full-time" | "part-time" | "contract" | "casual" | "seasonal";
export type WorkMode = "on-site" | "remote" | "hybrid";

export interface Post {
  id: string;
  type: ContentType;
  status: PostStatus;
  orgId: string;
  orgName: string;
  orgLogoURL: string | null;
  orgTier: SubscriptionTier;
  title: string;
  description: string;
  location: { city: string; province: string };
  featured: boolean;
  featuredUntil: FirebaseTimestamp | null;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  expiresAt: FirebaseTimestamp;
  viewCount: number;
  saveCount: number;

  // Job-specific
  salary?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  deadline?: FirebaseTimestamp;
  requirements?: string;
  howToApply?: string;
  externalUrl?: string;
  contactEmail?: string;
  source?: JobSource;
  externalJobId?: string;
  syncedFrom?: string;
  applicationCount?: number;

  // Event-specific
  eventCategory?: string;
  startDate?: FirebaseTimestamp;
  endDate?: FirebaseTimestamp;
  venue?: string;
  rsvpLink?: string;
  admissionCost?: string;
  coverImage?: string;

  // Scholarship-specific
  awardAmount?: string;
  eligibility?: string;
  scholarshipCategory?: string;

  // Program-specific
  institution?: string;
  programCategory?: string;
  duration?: string;
  credentialType?: string;
  tuition?: string;
  intakeDates?: string;
  deliveryMode?: string;
  prerequisites?: string;

  // Business-specific
  businessCategory?: string;
  phone?: string;
  email?: string;
  socialLinks?: Record<string, string>;
  photos?: string[];
  hours?: string;
  deliveryOptions?: string;

  // Story-specific
  personName?: string;
  personNation?: string;
  personPhoto?: string;
  pullQuote?: string;
  relatedOrg?: string;
  videoEmbed?: string;
  storyTags?: string[];

  // Promotion-specific
  promoImage?: string;
  promoLink?: string;
  ctaText?: string;

  // Livestream-specific
  youtubeVideoId?: string;
  streamCategory?: string;
  isLive?: boolean;
}

// ---------- Applications ----------
export type ApplicationStatus = "submitted" | "viewed" | "under_review" | "interview" | "offered" | "rejected";

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  orgId: string;
  orgName: string;
  applicantUid: string;
  applicantName: string;
  applicantEmail: string;
  resumeURL: string;
  coverMessage: string;
  attachments: string[];
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; at: FirebaseTimestamp; note?: string }[];
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// ---------- Messages ----------
export interface Conversation {
  id: string;
  participants: string[];
  orgId: string | null;
  postId: string | null;
  lastMessage: string;
  lastMessageAt: FirebaseTimestamp;
  createdAt: FirebaseTimestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  text: string;
  attachments: string[];
  readBy: string[];
  createdAt: FirebaseTimestamp;
}

// ---------- Bookmarks ----------
export interface Bookmark {
  id: string;
  uid: string;
  postId: string;
  postType: ContentType;
  createdAt: FirebaseTimestamp;
}

// ---------- Notifications ----------
export type NotificationType =
  | "new_message"
  | "application_status"
  | "new_job_match"
  | "closing_soon"
  | "content_approved"
  | "content_rejected"
  | "new_application"
  | "subscription_renewal"
  | "payment_failed"
  | "org_verified"
  | "post_expiring"
  | "featured_slot_update";

export interface Notification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  emailSent: boolean;
  createdAt: FirebaseTimestamp;
}

// ---------- Email Campaigns ----------
export interface Campaign {
  id: string;
  subject: string;
  body: string;
  audience: {
    segment: string;
    filters: Record<string, unknown>;
  };
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledFor: FirebaseTimestamp | null;
  sentAt: FirebaseTimestamp | null;
  sentBy: string;
  stats: {
    total: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
  createdAt: FirebaseTimestamp;
}

// ---------- Helpers ----------
export type FirebaseTimestamp = {
  seconds: number;
  nanoseconds: number;
};

// Pricing constants
export const PRICING = {
  STANDARD_JOB: 12500, // $125 in cents
  FEATURED_JOB: 20000, // $200 in cents
  SCHOOL_PROGRAM: 5000, // $50 in cents
  TIER1_ANNUAL: 125000, // $1,250 in cents
  TIER2_ANNUAL: 250000, // $2,500 in cents
  SCHOOL_ANNUAL: 550000, // $5,500 in cents
} as const;
