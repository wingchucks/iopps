/**
 * Conference types for the IOPPS platform.
 */

import type { FirestoreTimestamp, TimestampLike } from './common';

// ============================================
// CONFERENCE SUB-TYPES
// ============================================

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
  earlyBirdDeadline?: FirestoreTimestamp | string | null;
  regularPrice?: string;
  groupRate?: string;
  groupMinimum?: number;
  indigenousRate?: string;
  studentRate?: string;
  virtualPrice?: string;
  registrationDeadline?: FirestoreTimestamp | string | null;
}

// ============================================
// CONFERENCE VISIBILITY
// ============================================

export type ConferenceVisibilityTier = "standard" | "demoted" | "featured";

// ============================================
// CONFERENCE
// ============================================

export interface Conference {
  id: string;
  employerId: string;
  employerName?: string;
  organizerName?: string;
  title: string;
  description: string;
  location: string;
  startDate: FirestoreTimestamp | string | null;
  endDate: FirestoreTimestamp | string | null;
  registrationLink?: string;
  registrationUrl?: string;
  cost?: string;
  format?: string;
  active: boolean;
  createdAt?: FirestoreTimestamp | null;

  // Visibility & Lifecycle fields (45-day free visibility system)
  publishedAt?: FirestoreTimestamp | Date | string | null;
  visibilityTier?: ConferenceVisibilityTier;
  freeVisibilityExpiresAt?: FirestoreTimestamp | Date | string | null;
  eventFingerprint?: string;
  freeVisibilityUsed?: boolean;

  // Payment & Featured fields
  featured?: boolean;
  featuredExpiresAt?: FirestoreTimestamp | Date | string | null;
  featurePlan?: "FEATURED_90" | "FEATURED_365";
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: FirestoreTimestamp | Date | string | null;
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

// ============================================
// CONFERENCE REGISTRATION
// ============================================

export interface ConferenceRegistration {
  id: string;
  conferenceId: string;
  employerId: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  specialRequests?: string;
  createdAt?: FirestoreTimestamp | null;
}

// ============================================
// SAVED CONFERENCES
// ============================================

export interface SavedConference {
  id?: string;
  memberId: string;
  conferenceId: string;
  createdAt?: TimestampLike | null;
  conference?: Conference | null;
}
