/**
 * Powwow event Firestore operations (server-side, firebase-admin).
 *
 * Collection: "powwows"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const POWWOWS_COLLECTION = "powwows";

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

export type PowwowEventType = "Pow Wow" | "Sports" | "Career Fair" | "Other";

export interface PowwowEvent {
  id: string;
  employerId: string;
  name: string;
  host?: string;
  location: string;
  region?: string;
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

export interface PowwowFilters {
  /** Only return active powwows. Defaults to true. */
  activeOnly?: boolean;
  /** Include expired powwows (past endDate). Defaults to false. */
  includeExpired?: boolean;
  /** Filter by region */
  region?: string;
  /** Filter by event type */
  eventType?: PowwowEventType;
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

/** Check if a powwow has ended based on endDate. */
function isPowwowExpired(powwow: PowwowEvent): boolean {
  const now = new Date();
  const endDate = toDate(powwow.endDate as TimestampLike | null);
  if (endDate && endDate < now) return true;
  return false;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List powwow events with optional filters.
 * Queries the "powwows" collection.
 *
 * @param filters - Optional filter criteria
 * @returns Array of powwow events
 */
export async function getPowwows(
  filters: PowwowFilters = {}
): Promise<PowwowEvent[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(POWWOWS_COLLECTION);

    if (filters.activeOnly !== false) {
      ref = ref.where("active", "==", true);
    }

    if (filters.region) {
      ref = ref.where("region", "==", filters.region);
    }

    if (filters.eventType) {
      ref = ref.where("eventType", "==", filters.eventType);
    }

    ref = ref.orderBy("createdAt", "desc");

    if (filters.pageSize) {
      ref = ref.limit(filters.pageSize);
    }

    const snap = await ref.get();

    let powwows = snap.docs.map((doc) => doc.data() as PowwowEvent);

    // Client-side expired filtering
    if (!filters.includeExpired) {
      powwows = powwows.filter((p) => !isPowwowExpired(p));
    }

    return powwows;
  } catch (error) {
    console.error("[getPowwows] Error:", error);
    return [];
  }
}

/**
 * Get a single powwow event by its document ID.
 * Queries the "powwows" collection.
 *
 * @param id - Powwow document ID
 * @returns The powwow event or null if not found
 */
export async function getPowwowById(
  id: string
): Promise<PowwowEvent | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(POWWOWS_COLLECTION)
      .doc(id)
      .get();

    if (!snap.exists) return null;
    return snap.data() as PowwowEvent;
  } catch (error) {
    console.error("[getPowwowById] Error:", error);
    return null;
  }
}

/**
 * Create a new powwow event document in the "powwows" collection.
 *
 * @param data - Powwow data (excluding id, createdAt)
 * @returns The new document ID
 */
export async function createPowwow(
  data: Omit<PowwowEvent, "id" | "createdAt">
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const ref = await adminDb.collection(POWWOWS_COLLECTION).add({
    ...data,
    active: data.active ?? true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update with own ID (matching v1 pattern)
  await adminDb
    .collection(POWWOWS_COLLECTION)
    .doc(ref.id)
    .update({ id: ref.id });

  return ref.id;
}

/**
 * Update fields on an existing powwow event.
 * Queries the "powwows" collection.
 *
 * @param id - Powwow document ID
 * @param data - Partial fields to update
 */
export async function updatePowwow(
  id: string,
  data: Partial<PowwowEvent>
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
    .collection(POWWOWS_COLLECTION)
    .doc(id)
    .update(cleanData);
}
