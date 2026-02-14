/**
 * Vendor Firestore operations (server-side, firebase-admin).
 *
 * Collection: "vendors"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const VENDORS_COLLECTION = "vendors";

// ============================================
// TYPES
// ============================================

export type VendorStatus = "draft" | "pending" | "active" | "suspended";

export type VendorCategory =
  | "Art & Crafts"
  | "Jewelry & Accessories"
  | "Clothing & Apparel"
  | "Food & Beverages"
  | "Health & Wellness"
  | "Home & Living"
  | "Books & Media"
  | "Services"
  | "Other";

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug?: string;
  tagline?: string;
  description: string;
  category: VendorCategory | string;
  location?: string;
  region?: string;
  offersShipping?: boolean;
  onlineOnly?: boolean;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  nation?: string;
  communityStory?: string;
  status: VendorStatus;
  featured?: boolean;
  verified?: boolean;
  viewCount?: number;
  subscriptionId?: string;
  subscriptionStatus?: "active" | "cancelled" | "past_due";
  subscriptionEndsAt?: Timestamp | null;
  freeListingEnabled?: boolean;
  freeListingReason?: string;
  freeListingGrantedAt?: Timestamp | null;
  freeListingGrantedBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface VendorFilters {
  /** Filter by approval status */
  status?: VendorStatus;
  /** Filter by category */
  category?: string;
  /** Filter by region */
  region?: string;
  /** Page size */
  pageSize?: number;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * List vendors with optional filters.
 * Queries the "vendors" collection.
 *
 * @param filters - Optional filter criteria
 * @returns Array of vendor profiles
 */
export async function getVendors(
  filters: VendorFilters = {}
): Promise<Vendor[]> {
  if (!adminDb) return [];

  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(VENDORS_COLLECTION);

    if (filters.status) {
      ref = ref.where("status", "==", filters.status);
    } else {
      // Default: only active vendors
      ref = ref.where("status", "==", "active");
    }

    if (filters.category) {
      ref = ref.where("category", "==", filters.category);
    }

    if (filters.region) {
      ref = ref.where("region", "==", filters.region);
    }

    ref = ref.orderBy("createdAt", "desc");

    if (filters.pageSize) {
      ref = ref.limit(filters.pageSize);
    }

    const snap = await ref.get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as Vendor),
      id: doc.id,
    }));
  } catch (error) {
    console.error("[getVendors] Error:", error);
    return [];
  }
}

/**
 * Get a single vendor by its document ID.
 * Queries the "vendors" collection.
 *
 * @param id - Vendor document ID
 * @returns The vendor profile or null if not found
 */
export async function getVendorById(id: string): Promise<Vendor | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb.collection(VENDORS_COLLECTION).doc(id).get();
    if (!snap.exists) return null;

    const data = snap.data() as Record<string, unknown>;

    // Convert Timestamps to Dates for serialization
    if (data.createdAt && typeof data.createdAt === "object" && "toDate" in (data.createdAt as object)) {
      data.createdAt = (data.createdAt as Timestamp).toDate();
    }
    if (data.updatedAt && typeof data.updatedAt === "object" && "toDate" in (data.updatedAt as object)) {
      data.updatedAt = (data.updatedAt as Timestamp).toDate();
    }

    return { ...(data as unknown as Vendor), id: snap.id };
  } catch (error) {
    console.error("[getVendorById] Error:", error);
    return null;
  }
}

/**
 * Create a new vendor document in the "vendors" collection.
 * Uses the userId as the document ID (matching v1 pattern).
 *
 * @param data - Vendor data (userId required)
 * @returns The new document ID
 */
export async function createVendor(
  data: Omit<Vendor, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const docId = data.userId;
  const ref = adminDb.collection(VENDORS_COLLECTION).doc(docId);

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
    status: data.status || "draft",
    viewCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docId;
}

/**
 * Update fields on an existing vendor profile.
 * Queries the "vendors" collection.
 *
 * @param id - Vendor document ID
 * @param data - Partial fields to update
 */
export async function updateVendor(
  id: string,
  data: Partial<Omit<Vendor, "id" | "createdAt">>
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
    .collection(VENDORS_COLLECTION)
    .doc(id)
    .update({
      ...cleanData,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
