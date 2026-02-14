// Re-export all Firestore operations from domain-specific files
// This file maintains backwards compatibility - all existing imports will continue to work
//
// The firestore operations have been split into domain-specific files:
// - firestore/employers.ts - Employer profile operations
// - firestore/jobs.ts - Job posting operations
// - firestore/applications.ts - Job application operations
// - firestore/members.ts - Member profile operations
// - firestore/conferences.ts - Conference operations
// - firestore/scholarships.ts - Scholarship operations
// - firestore/powwows.ts - Powwow event operations
// - firestore/vendors.ts - Vendor/shop operations
// - firestore/livestreams.ts - Livestream operations
// - firestore/messaging.ts - Messaging/conversation operations
// - firestore/notifications.ts - Notification operations
// - firestore/misc.ts - Global search, contacts, settings, RSS, job alerts

export * from "./firestore/index";

// Re-export types that were defined in this file for backwards compatibility
export type { SavedConference } from "./firestore/conferences";
export type { UpsertVendorResult } from "./firestore/vendors";
export type { GlobalSearchResults, ContactSubmissionInput } from "./firestore/misc";
