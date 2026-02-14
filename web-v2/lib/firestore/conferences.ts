/**
 * Conference Firestore operations (server-side, firebase-admin).
 *
 * Collection: "conferences"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const CONFERENCES_COLLECTION = "conferences";

// ============================================
// TYPES
// ============================================

/**
 * A flexible timestamp type covering Firestore Timestamps,
 * serialized timestamps, Date objects, and ISO strings.
 */
type TimestampLike =
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date }
  | Date
  | string;

export type ConferenceVisibilityTier = "standard" | "demoted" | "featured";

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

export interface ConferenceSpeaker {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  nation?: string;
  bio?: string;
  photoUrl?: string;
}

export interface ConferenceSponsor {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: "platinum" | "gold" | "silver" | "bronze" | "community";
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
  publishedAt?: Timestamp | Date | string | null;
  visibilityTier?: ConferenceVisibilityTier;
  freeVisibilityExpiresAt?: Timestamp | Date | string | null;
  eventFingerprint?: string;
  freeVisibilityUsed?: boolean;
  featured?: boolean;
  featuredExpiresAt?: Timestamp | Date | string | null;
  paymentStatus?: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  productType?: string;
  amountPaid?: number;
  expiresAt?: Timestamp | Date | string | null;
  viewsCount?: number;
  imageUrl?: string;
  bannerImageUrl?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  promoVideoUrl?: string;
  venue?: ConferenceVenue;
  speakers?: ConferenceSpeaker[];
  sponsors?: ConferenceSponsor[];
  eventType?: "in-person" | "virtual" | "hybrid";
  livestreamUrl?: string;
  expectedAttendees?: string;
  targetAudience?: string[];
  topics?: string[];
  timezone?: string;
  indigenousFocused?: boolean;
  contactEmail?: string;
  contactPhone?: string;
}

export interface ConferenceFilters {
  /** Only return active conferences. Defaults to true. */
  activeOnly?: boolean;
  /** Include expired conferences (past endDate). Defaults to false. */
  includeExpired?: boolean;
  /** Include demoted conferences. Defaults to false. */
  includeDemoted?: boolean;
  /** Page size */
  pageSize?: number;
}

// ============================================
// HELPERS
// ============================================

/** Convert a TimestampLike value to a plain Date. */
function toDate(value: TimestampLike | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

/** Check if a conference has ended. */
function isConferenceExpired(conference: Conference): boolean {
  const now = new Date();
  const endDate = toDate(conference.endDate as TimestampLike | null);
  if (endDate && endDate < now) return true;
  return false;
}

/** Compute the visibility tier for a conference. */
function computeVisibilityTier(conference: Conference): ConferenceVisibilityTier {
  const now = new Date();

  if (conference.featured) {
    const featuredExpires = toDate(conference.featuredExpiresAt as TimestampLike | null);
    if (!featuredExpires || featuredExpires > now) {
      return "featured";
    }
  }

  const freeExpires = toDate(conference.freeVisibilityExpiresAt as TimestampLike | null);
  if (freeExpires && freeExpires > now) {
    return "standard";
  }

  const publishedAt = toDate(conference.publishedAt as TimestampLike | null);
  if (publishedAt) {
    return "demoted";
  }

  return "standard";
}

/** Check if a conference is visible in standard/featured listings. */
function isConferenceVisible(conference: Conference): boolean {
  if (!conference.active) return false;
  if (isConferenceExpired(conference)) return false;
  const tier = computeVisibilityTier(conference);
  return tier === "featured" || tier === "standard";
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List conferences with optional filters and visibility-aware sorting.
 * Featured conferences appear first, then standard conferences by startDate.
 * Queries the "conferences" collection.
 *
 * @param filters - Optional filter criteria
 * @returns Array of conferences
 */
export async function getConferences(
  filters: ConferenceFilters = {}
): Promise<Conference[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(CONFERENCES_COLLECTION);

    if (filters.activeOnly !== false) {
      ref = ref.where("active", "==", true);
    }

    ref = ref.orderBy("startDate", "asc");

    if (filters.pageSize) {
      ref = ref.limit(filters.pageSize);
    }

    const snap = await ref.get();

    let conferences = snap.docs.map((doc) => doc.data() as Conference);

    // Client-side expired filtering
    if (!filters.includeExpired) {
      conferences = conferences.filter((c) => !isConferenceExpired(c));
    }

    // Visibility filtering (exclude demoted unless requested)
    if (!filters.includeDemoted) {
      conferences = conferences.filter((c) => isConferenceVisible(c));
    }

    // Sort: featured first, then by startDate
    conferences.sort((a, b) => {
      const aTier = computeVisibilityTier(a);
      const bTier = computeVisibilityTier(b);

      if (aTier === "featured" && bTier !== "featured") return -1;
      if (bTier === "featured" && aTier !== "featured") return 1;

      if (aTier === "featured" && bTier === "featured") {
        const aExpires = toDate(a.featuredExpiresAt as TimestampLike | null)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bExpires = toDate(b.featuredExpiresAt as TimestampLike | null)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aExpires - bExpires;
      }

      const aStart = toDate(a.startDate as TimestampLike | null)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bStart = toDate(b.startDate as TimestampLike | null)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    });

    return conferences;
  } catch (error) {
    console.error("[getConferences] Error:", error);
    return [];
  }
}

/**
 * Get a single conference by its document ID.
 * Queries the "conferences" collection.
 *
 * @param id - Conference document ID
 * @returns The conference or null if not found
 */
export async function getConferenceById(
  id: string
): Promise<Conference | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(CONFERENCES_COLLECTION)
      .doc(id)
      .get();

    if (!snap.exists) return null;
    return snap.data() as Conference;
  } catch (error) {
    console.error("[getConferenceById] Error:", error);
    return null;
  }
}

/**
 * Create a new conference document in the "conferences" collection.
 *
 * @param data - Conference data (excluding id, createdAt)
 * @returns The new document ID
 */
export async function createConference(
  data: Omit<Conference, "id" | "createdAt">
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const ref = await adminDb.collection(CONFERENCES_COLLECTION).add({
    ...data,
    active: data.active ?? true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update with own ID (matching v1 pattern)
  await adminDb
    .collection(CONFERENCES_COLLECTION)
    .doc(ref.id)
    .update({ id: ref.id });

  return ref.id;
}

/**
 * Update fields on an existing conference.
 * Queries the "conferences" collection.
 *
 * @param id - Conference document ID
 * @param data - Partial fields to update
 */
export async function updateConference(
  id: string,
  data: Partial<Conference>
): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  // Filter out undefined values
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await adminDb
    .collection(CONFERENCES_COLLECTION)
    .doc(id)
    .update(cleanData);
}
