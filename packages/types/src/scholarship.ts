/**
 * Scholarship types for the IOPPS platform.
 */

import type { FirestoreTimestamp } from './common';
import type { ApplicationStatus } from './application';
import type { ProgramLevel, ProgramCategory } from './education';

// ============================================
// SCHOLARSHIP APPLICATION METHOD
// ============================================

export type ScholarshipApplicationMethod =
  | 'external_link'
  | 'email'
  | 'institution_portal'
  | 'instructions_provided';

// ============================================
// SCHOLARSHIP
// ============================================

export interface Scholarship {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  provider: string;
  providerName?: string; // Alias for provider
  description: string;
  amount?: number | string;
  deadline?: FirestoreTimestamp | string | Date | null;
  level: string;
  region?: string;
  type: string;
  imageUrl?: string;
  imagePath?: string;
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
  active: boolean;
  status?: "active" | "upcoming" | "closed" | "expired";

  // Application method fields
  applicationMethod?: ScholarshipApplicationMethod;
  applicationUrl?: string | null;
  applicationEmail?: string;
  applicationInstructions?: string;

  // Recurring deadline fields
  isRecurring?: boolean;
  recurringSchedule?: string | null;

  // Analytics
  applyClickCount?: number;
  viewCount?: number;

  // Admin override fields
  adminOverride?: {
    forcePublished?: boolean;
    forceUnpublished?: boolean;
    reopenedAt?: FirestoreTimestamp | null;
    reopenedBy?: string;
    flaggedAsSpam?: boolean;
    flaggedAt?: FirestoreTimestamp | null;
    flaggedBy?: string;
  };

  // Soft delete
  deletedAt?: FirestoreTimestamp | null;
  deletedBy?: string;

  // Education pillar extensions
  schoolId?: string;
  providerType?: "school" | "government" | "organization" | "private";
  eligibility?: ScholarshipEligibility;
  amountStructured?: ScholarshipAmount;
  applicationOpen?: FirestoreTimestamp | string | null;
  applicationProcess?: string;
  sourceUrl?: string;
  communityStats?: ScholarshipCommunityStats;
}

// ============================================
// SCHOLARSHIP APPLICATION
// ============================================

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
  createdAt?: FirestoreTimestamp | null;
  updatedAt?: FirestoreTimestamp | null;
}

// ============================================
// SCHOLARSHIP ANALYTICS
// ============================================

export interface ScholarshipApplyClickEvent {
  id: string;
  scholarshipId: string;
  organizationId: string;
  timestamp: FirestoreTimestamp | null;
  source: 'web' | 'mobile';
  userType: 'anonymous' | 'logged-in';
  userId?: string;
  sessionId: string;
  fingerprintHash: string;
  dedupeKey: string;
}

export interface ScholarshipAdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  actionType: 'force_publish' | 'force_unpublish' | 'mark_expired' | 'reopen' | 'edit' | 'flag_spam' | 'delete' | 'restore';
  scholarshipId: string;
  timestamp: FirestoreTimestamp | null;
  reason?: string;
  beforeSnapshot?: Partial<Scholarship>;
  afterSnapshot?: Partial<Scholarship>;
}

// ============================================
// EXTENDED SCHOLARSHIP (Education Pillar)
// ============================================

export type ScholarshipProviderType = "school" | "government" | "organization" | "private";
export type IndigenousStatus = "first_nations" | "metis" | "inuit" | "all_indigenous" | "any";

export interface ScholarshipEligibility {
  indigenousStatus?: IndigenousStatus[];
  nations?: string[];
  provinces?: string[];
  studyLevel?: ProgramLevel[];
  fieldsOfStudy?: ProgramCategory[];
  programIds?: string[];
  schoolIds?: string[];
  gpaRequirement?: number;
  financialNeed?: boolean;
  otherRequirements?: string[];
}

export interface ScholarshipAmount {
  value: number;
  type: "fixed" | "range" | "variable" | "full_tuition";
  maxValue?: number;
  currency?: string;
}

export interface ScholarshipCommunityStats {
  recipientsCount?: number;
  connectionsReceived?: number;
}

export interface ExtendedScholarship extends Omit<Scholarship, 'amount'> {
  providerType?: ScholarshipProviderType;
  schoolId?: string;
  amountStructured?: ScholarshipAmount;
  eligibility?: ScholarshipEligibility;
  applicationOpen?: FirestoreTimestamp | string | null;
  isRecurring?: boolean;
  applicationProcess?: string;
  communityStats?: ScholarshipCommunityStats;
  sourceUrl?: string;
}
