/**
 * Pow Wow and event types for the IOPPS platform.
 */

import type { FirestoreTimestamp, NorthAmericanRegion } from './common';

// ============================================
// POWWOW EVENT TYPES
// ============================================

export const POWWOW_EVENT_TYPES = [
  'Pow Wow',
  'Sports',
  'Career Fair',
  'Other',
] as const;

export type PowwowEventType = typeof POWWOW_EVENT_TYPES[number];

// ============================================
// POWWOW EVENT
// ============================================

export interface PowwowEvent {
  id: string;
  employerId: string;
  name: string;
  host?: string;
  location: string;
  region?: NorthAmericanRegion;
  eventType?: PowwowEventType;
  season?: string;
  startDate?: FirestoreTimestamp | string | null;
  endDate?: FirestoreTimestamp | string | null;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  imageUrl?: string;
  featured?: boolean;
  createdAt?: FirestoreTimestamp | null;
  active: boolean;
}

// ============================================
// POWWOW REGISTRATION
// ============================================

export interface PowwowRegistration {
  id: string;
  powwowId: string;
  employerId: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  specialRequests?: string;
  createdAt?: FirestoreTimestamp | null;
}

// ============================================
// LIVE STREAM EVENTS
// ============================================

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
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt?: FirestoreTimestamp | null;
  active: boolean;
}
