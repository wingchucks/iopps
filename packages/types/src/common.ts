/**
 * Common/shared types used across the IOPPS platform.
 * These are foundational types referenced by multiple domain modules.
 */

/**
 * A flexible timestamp type that covers Firestore Timestamps,
 * serialized timestamps, Date objects, and ISO strings.
 * Used instead of importing directly from firebase/firestore to keep
 * this package dependency-free.
 */
export type TimestampLike =
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date }
  | Date
  | string;

/**
 * Firestore Timestamp interface.
 * Matches the shape of firebase/firestore Timestamp without requiring the dependency.
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
  toMillis: () => number;
}

/** Represents a Firestore Timestamp or null (common pattern for optional date fields). */
export type TimestampOrNull = FirestoreTimestamp | null;

/** North American regions (provinces and states) used across the platform. */
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

/** Backwards compatibility aliases */
export const CANADIAN_REGIONS = NORTH_AMERICAN_REGIONS;
export type CanadianRegion = NorthAmericanRegion;

/** Social links shared by multiple entity types. */
export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

/** Extended social links with all platforms (used by organizations). */
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
