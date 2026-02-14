/**
 * Organization / Employer Firestore operations (server-side, firebase-admin).
 *
 * Collection: "employers"
 *
 * IMPORTANT: The master collection name is "employers" (NOT "organizations").
 * This matches the v1 data layer exactly.
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const EMPLOYER_COLLECTION = "employers";

// ============================================
// TYPES
// ============================================

export type EmployerStatus = "incomplete" | "pending" | "approved" | "rejected" | "deleted";

export type OrgType =
  | "EMPLOYER"
  | "INDIGENOUS_BUSINESS"
  | "SCHOOL"
  | "NONPROFIT"
  | "GOVERNMENT"
  | "OTHER";

export type OrganizationModule = "hire" | "sell" | "educate" | "host" | "funding";

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

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

export interface OrganizationProfile {
  id: string;
  userId: string;
  organizationName: string;
  slug?: string;
  orgType?: OrgType;
  description?: string;
  story?: string;
  website?: string;
  location?: string;
  province?: string;
  city?: string;
  nation?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: SocialLinks;
  links?: ExtendedSocialLinks;
  status?: EmployerStatus;
  publicationStatus?: "DRAFT" | "PUBLISHED";
  directoryVisible?: boolean;
  enabledModules?: OrganizationModule[];
  contactEmail?: string;
  contactPhone?: string;
  territory?: string;
  size?: string;
  yearEstablished?: number;
  sector?: string;
  onboardingComplete?: boolean;
  tagline?: string;
  introVideoUrl?: string | null;
  isDirectoryVisible?: boolean;
  isGrandfathered?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  publishedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  deletedBy?: string;
  deleteReason?: string | null;
}

export interface OrganizationFilters {
  /** Filter by approval status */
  status?: EmployerStatus;
  /** Page size */
  pageSize?: number;
  /** Cursor for pagination */
  startAfterId?: string;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get a single organization/employer profile by document ID.
 * Queries the "employers" collection.
 *
 * @param id - Document ID (typically the user ID)
 * @returns The organization profile or null
 */
export async function getOrganization(
  id: string
): Promise<OrganizationProfile | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb.collection(EMPLOYER_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return { ...(snap.data() as OrganizationProfile), id: snap.id };
  } catch (error) {
    console.error("[getOrganization] Error:", error);
    return null;
  }
}

/**
 * Get an organization by the userId field.
 * First attempts a direct document lookup (since doc ID is often the userId),
 * then falls back to a query on the userId field.
 * Queries the "employers" collection.
 *
 * @param uid - The user's Firebase UID
 * @returns The organization profile or null
 */
export async function getOrganizationByUserId(
  uid: string
): Promise<OrganizationProfile | null> {
  if (!adminDb) return null;

  try {
    // First try: direct document lookup (doc ID === userId in most cases)
    const directSnap = await adminDb
      .collection(EMPLOYER_COLLECTION)
      .doc(uid)
      .get();
    if (directSnap.exists) {
      return {
        ...(directSnap.data() as OrganizationProfile),
        id: directSnap.id,
      };
    }

    // Second try: query by userId field
    const querySnap = await adminDb
      .collection(EMPLOYER_COLLECTION)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (querySnap.empty) return null;

    const doc = querySnap.docs[0];
    return { ...(doc.data() as OrganizationProfile), id: doc.id };
  } catch (error) {
    console.error("[getOrganizationByUserId] Error:", error);
    return null;
  }
}

/**
 * Create a new organization/employer document in the "employers" collection.
 *
 * @param data - Organization profile data (userId required)
 * @returns The new document ID
 */
export async function createOrganization(
  data: Omit<OrganizationProfile, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  // Use userId as document ID (matching v1 pattern)
  const docId = data.userId;
  const ref = adminDb.collection(EMPLOYER_COLLECTION).doc(docId);

  // Filter out undefined values
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await ref.set({
    ...cleanData,
    id: docId,
    status: data.status || "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docId;
}

/**
 * Update fields on an existing organization/employer document.
 * Queries the "employers" collection.
 *
 * @param id - Document ID of the employer
 * @param data - Partial fields to update
 */
export async function updateOrganization(
  id: string,
  data: Partial<Omit<OrganizationProfile, "id" | "userId" | "createdAt">>
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
    .collection(EMPLOYER_COLLECTION)
    .doc(id)
    .update({
      ...cleanData,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * List organizations with optional filters.
 * Queries the "employers" collection.
 *
 * @param filters - Optional status filter and pagination
 * @returns Array of organization profiles
 */
export async function getOrganizations(
  filters: OrganizationFilters = {}
): Promise<OrganizationProfile[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(EMPLOYER_COLLECTION);

    if (filters.status) {
      ref = ref.where("status", "==", filters.status);
    }

    ref = ref.orderBy("createdAt", "desc");

    if (filters.pageSize) {
      ref = ref.limit(filters.pageSize);
    }

    if (filters.startAfterId) {
      const startAfterDoc = await adminDb
        .collection(EMPLOYER_COLLECTION)
        .doc(filters.startAfterId)
        .get();
      if (startAfterDoc.exists) {
        ref = ref.startAfter(startAfterDoc);
      }
    }

    const snap = await ref.get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as OrganizationProfile),
      id: doc.id,
    }));
  } catch (error) {
    console.error("[getOrganizations] Error:", error);
    return [];
  }
}

/**
 * Approve an organization -- sets status to "approved".
 * Queries the "employers" collection.
 *
 * @param id - Document ID of the employer to approve
 */
export async function approveOrganization(id: string): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  await adminDb
    .collection(EMPLOYER_COLLECTION)
    .doc(id)
    .update({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Reject an organization -- sets status to "rejected" with a reason.
 * Queries the "employers" collection.
 *
 * @param id - Document ID of the employer to reject
 * @param reason - Reason for the rejection
 */
export async function rejectOrganization(
  id: string,
  reason: string
): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  await adminDb
    .collection(EMPLOYER_COLLECTION)
    .doc(id)
    .update({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
