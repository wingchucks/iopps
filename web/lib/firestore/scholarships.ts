/**
 * Scholarship Firestore operations (server-side, firebase-admin).
 *
 * Collection: "scholarships"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const SCHOLARSHIPS_COLLECTION = "scholarships";

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

export interface ScholarshipEligibility {
  indigenousStatus?: string[];
  nations?: string[];
  provinces?: string[];
  studyLevel?: string[];
  fieldsOfStudy?: string[];
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

export interface Scholarship {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  provider: string;
  providerName?: string;
  description: string;
  amount?: number | string;
  deadline?: Timestamp | string | Date | null;
  level: string;
  region?: string;
  type: string;
  imageUrl?: string;
  imagePath?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  active: boolean;
  status?: "active" | "upcoming" | "closed" | "expired";
  applicationMethod?: string;
  applicationUrl?: string | null;
  applicationEmail?: string;
  applicationInstructions?: string;
  isRecurring?: boolean;
  recurringSchedule?: string | null;
  applyClickCount?: number;
  viewCount?: number;
  schoolId?: string;
  providerType?: "school" | "government" | "organization" | "private";
  eligibility?: ScholarshipEligibility;
  amountStructured?: ScholarshipAmount;
  applicationOpen?: Timestamp | string | null;
  applicationProcess?: string;
  sourceUrl?: string;
}

export interface ScholarshipFilters {
  /** Only return active scholarships. Defaults to true. */
  activeOnly?: boolean;
  /** Include expired scholarships (past deadline). Defaults to false. */
  includeExpired?: boolean;
  /** Filter by region */
  region?: string;
  /** Filter by level */
  level?: string;
  /** Filter by scholarship type */
  type?: string;
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

/** Check if a scholarship deadline has passed. */
function isScholarshipExpired(scholarship: Scholarship): boolean {
  const now = new Date();
  const deadline = toDate(scholarship.deadline as TimestampLike | null);
  if (deadline && deadline < now) return true;
  return false;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List scholarships with optional filters.
 * Queries the "scholarships" collection.
 *
 * @param filters - Optional filter criteria
 * @returns Array of scholarships
 */
export async function getScholarships(
  filters: ScholarshipFilters = {}
): Promise<Scholarship[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(SCHOLARSHIPS_COLLECTION);

    if (filters.activeOnly !== false) {
      ref = ref.where("active", "==", true);
    }

    if (filters.region) {
      ref = ref.where("region", "==", filters.region);
    }

    if (filters.level) {
      ref = ref.where("level", "==", filters.level);
    }

    if (filters.type) {
      ref = ref.where("type", "==", filters.type);
    }

    ref = ref.orderBy("createdAt", "desc");

    if (filters.pageSize) {
      ref = ref.limit(filters.pageSize);
    }

    const snap = await ref.get();

    let scholarships = snap.docs.map((doc) => doc.data() as Scholarship);

    // Client-side expired filtering
    if (!filters.includeExpired) {
      scholarships = scholarships.filter((s) => !isScholarshipExpired(s));
    }

    return scholarships;
  } catch (error) {
    console.error("[getScholarships] Error:", error);
    return [];
  }
}

/**
 * Get a single scholarship by its document ID.
 * Queries the "scholarships" collection.
 *
 * @param id - Scholarship document ID
 * @returns The scholarship or null if not found
 */
export async function getScholarshipById(
  id: string
): Promise<Scholarship | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(SCHOLARSHIPS_COLLECTION)
      .doc(id)
      .get();

    if (!snap.exists) return null;
    return snap.data() as Scholarship;
  } catch (error) {
    console.error("[getScholarshipById] Error:", error);
    return null;
  }
}

/**
 * Create a new scholarship document in the "scholarships" collection.
 *
 * @param data - Scholarship data (excluding id, createdAt)
 * @returns The new document ID
 */
export async function createScholarship(
  data: Omit<Scholarship, "id" | "createdAt">
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const ref = await adminDb.collection(SCHOLARSHIPS_COLLECTION).add({
    ...data,
    active: data.active ?? true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update the document with its own ID (matching v1 pattern)
  await adminDb
    .collection(SCHOLARSHIPS_COLLECTION)
    .doc(ref.id)
    .update({ id: ref.id });

  return ref.id;
}

/**
 * Update fields on an existing scholarship.
 * Queries the "scholarships" collection.
 *
 * @param id - Scholarship document ID
 * @param data - Partial fields to update
 */
export async function updateScholarship(
  id: string,
  data: Partial<Scholarship>
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
    .collection(SCHOLARSHIPS_COLLECTION)
    .doc(id)
    .update({
      ...cleanData,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
