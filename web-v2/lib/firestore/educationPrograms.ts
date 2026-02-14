/**
 * Education Program Firestore operations (server-side, firebase-admin).
 *
 * Collection: "education_programs"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const EDUCATION_PROGRAMS_COLLECTION = "education_programs";

// ============================================
// TYPES
// ============================================

export type ProgramLevel =
  | "Certificate"
  | "Diploma"
  | "Associate Degree"
  | "Bachelor's Degree"
  | "Master's Degree"
  | "Doctoral Degree"
  | "Professional Development"
  | "Continuing Education"
  | "Other";

export type ProgramDelivery = "in-person" | "online" | "hybrid";

export type ProgramCategory = string;

export type ProgramStatus = "draft" | "pending" | "approved" | "rejected";

export interface EducationProgram {
  id: string;
  schoolId: string;
  name: string;
  slug?: string;
  description?: string;
  category?: ProgramCategory;
  level?: ProgramLevel;
  deliveryMethod?: ProgramDelivery;
  duration?: string;
  tuition?: string;
  startDates?: string[];
  applicationDeadline?: string;
  prerequisites?: string[];
  outcomes?: string[];
  indigenousFocused?: boolean;
  featured?: boolean;
  isPublished?: boolean;
  status?: ProgramStatus;
  province?: string;
  imageUrl?: string;
  website?: string;
  viewCount?: number;
  inquiryCount?: number;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface EducationProgramFilters {
  /** Filter by school */
  schoolId?: string;
  /** Filter by program category */
  category?: ProgramCategory;
  /** Filter by academic level */
  level?: ProgramLevel;
  /** Filter by delivery method */
  deliveryMethod?: ProgramDelivery;
  /** Only indigenous-focused programs */
  indigenousFocused?: boolean;
  /** Filter by approval status */
  status?: ProgramStatus;
  /** Only return published and approved programs. Defaults to true. */
  publishedOnly?: boolean;
  /** Only featured programs */
  featured?: boolean;
  /** Maximum results */
  maxResults?: number;
  /** Client-side text search against name/description/category */
  search?: string;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List education programs with optional filters.
 * Queries the "education_programs" collection.
 *
 * @param filters - Optional filter criteria
 * @returns Array of education programs sorted by name
 */
export async function getEducationPrograms(
  filters: EducationProgramFilters = {}
): Promise<EducationProgram[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(
      EDUCATION_PROGRAMS_COLLECTION
    );

    if (filters.schoolId) {
      ref = ref.where("schoolId", "==", filters.schoolId);
    }

    if (filters.category) {
      ref = ref.where("category", "==", filters.category);
    }

    if (filters.level) {
      ref = ref.where("level", "==", filters.level);
    }

    if (filters.deliveryMethod) {
      ref = ref.where("deliveryMethod", "==", filters.deliveryMethod);
    }

    if (filters.indigenousFocused !== undefined) {
      ref = ref.where("indigenousFocused", "==", filters.indigenousFocused);
    }

    if (filters.status) {
      ref = ref.where("status", "==", filters.status);
    }

    // Default: only published and approved programs for public listings
    if (filters.publishedOnly !== false && !filters.schoolId) {
      ref = ref.where("isPublished", "==", true);
      ref = ref.where("status", "==", "approved");
    }

    if (filters.featured) {
      ref = ref.where("featured", "==", true);
    }

    ref = ref.orderBy("name", "asc");

    if (filters.maxResults) {
      ref = ref.limit(filters.maxResults);
    }

    const snap = await ref.get();

    let programs = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EducationProgram[];

    // Client-side text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      programs = programs.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
      );
    }

    return programs;
  } catch (error) {
    console.error("[getEducationPrograms] Error:", error);
    return [];
  }
}

/**
 * Get a single education program by its document ID.
 * Queries the "education_programs" collection.
 *
 * @param id - Program document ID
 * @returns The education program or null if not found
 */
export async function getEducationProgramById(
  id: string
): Promise<EducationProgram | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(EDUCATION_PROGRAMS_COLLECTION)
      .doc(id)
      .get();

    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as EducationProgram;
  } catch (error) {
    console.error("[getEducationProgramById] Error:", error);
    return null;
  }
}
