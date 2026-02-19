/**
 * School Firestore operations (server-side, firebase-admin).
 *
 * Collection: "schools"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const SCHOOLS_COLLECTION = "schools";

// ============================================
// TYPES
// ============================================

export interface SchoolCampus {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface SchoolStats {
  totalStudents?: number;
  indigenousStudentPercentage?: number;
  graduationRate?: number;
  employmentRate?: number;
  averageClassSize?: number;
  studentFacultyRatio?: string;
  viewsCount?: number;
}

export interface SchoolVerification {
  isVerified?: boolean;
  indigenousControlled?: boolean;
  verifiedAt?: Timestamp | null;
  verifiedBy?: string;
}

export interface School {
  id: string;
  employerId: string;
  name: string;
  slug?: string;
  type?: string;
  description?: string;
  mission?: string;
  logoUrl?: string;
  bannerUrl?: string;
  headOffice?: {
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
  };
  campuses?: SchoolCampus[];
  website?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  stats?: SchoolStats;
  verification?: SchoolVerification;
  accreditations?: string[];
  specializations?: string[];
  supportServices?: string[];
  nation?: string;
  territory?: string;
  isPublished?: boolean;
  featured?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SchoolFilters {
  /** Filter by school type */
  type?: string;
  /** Filter by province */
  province?: string;
  /** Filter by indigenous-controlled status */
  indigenousControlled?: boolean;
  /** Only return published schools. Defaults to true. */
  publishedOnly?: boolean;
  /** Limit the number of results */
  limitCount?: number;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List schools with optional filters.
 * Queries the "schools" collection.
 * Results are sorted by name client-side (to avoid composite index requirements).
 *
 * @param filters - Optional filter criteria
 * @returns Array of schools sorted alphabetically by name
 */
export async function getSchools(
  filters: SchoolFilters = {}
): Promise<School[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(SCHOOLS_COLLECTION);

    if (filters.publishedOnly !== false) {
      ref = ref.where("isPublished", "==", true);
    }

    if (filters.type) {
      ref = ref.where("type", "==", filters.type);
    }

    if (filters.province) {
      ref = ref.where("headOffice.province", "==", filters.province);
    }

    if (filters.indigenousControlled !== undefined) {
      ref = ref.where(
        "verification.indigenousControlled",
        "==",
        filters.indigenousControlled
      );
    }

    if (filters.limitCount) {
      ref = ref.limit(filters.limitCount);
    }

    const snap = await ref.get();

    const schools = snap.docs.map((doc) => doc.data() as School);

    // Sort by name client-side (matching v1 pattern)
    return schools.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  } catch (error) {
    console.error("[getSchools] Error:", error);
    return [];
  }
}

/**
 * Get a single school by its document ID.
 * Queries the "schools" collection.
 *
 * @param id - School document ID
 * @returns The school or null if not found
 */
export async function getSchoolById(id: string): Promise<School | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb.collection(SCHOOLS_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as School;
  } catch (error) {
    console.error("[getSchoolById] Error:", error);
    return null;
  }
}

/**
 * Get a school by its slug field.
 * Only returns published schools.
 * Queries the "schools" collection.
 *
 * @param slug - The URL-friendly slug
 * @returns The school or null if not found
 */
export async function getSchoolBySlug(slug: string): Promise<School | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(SCHOOLS_COLLECTION)
      .where("slug", "==", slug)
      .where("isPublished", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as School;
  } catch (error) {
    console.error("[getSchoolBySlug] Error:", error);
    return null;
  }
}
