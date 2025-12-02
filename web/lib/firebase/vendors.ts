/**
 * Shop Indigenous Vendor Operations
 *
 * CRUD operations for vendors in the Shop Indigenous marketplace.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  or,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type VendorStatus = "draft" | "active" | "paused" | "suspended";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type PriceRange = "budget" | "mid" | "premium" | "luxury";
export type ServiceDelivery = "remote" | "onsite" | "hybrid";

export interface GalleryImage {
  url: string;
  caption: string;
  order?: number;
}

export interface VendorLocation {
  city: string;
  province: string;
  country: string;
  region: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface VendorSocialLinks {
  instagram?: string;
  facebook?: string;
  pinterest?: string;
  tiktok?: string;
  youtube?: string;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  tagline: string;
  description: string;
  nation: string;
  nationId: string;
  additionalNations: string[];
  website: string;
  email: string;
  phone: string;
  profileImage: string;
  coverImage: string;
  gallery: GalleryImage[];
  videoUrl: string;
  categories: string[];
  categoryIds: string[];
  materials: string[];
  techniques: string[];
  priceRange: PriceRange;
  acceptsCustomOrders: boolean;
  madeToOrder: boolean;
  serviceDelivery?: ServiceDelivery;
  location: VendorLocation;
  socialLinks: VendorSocialLinks;
  status: VendorStatus;
  verificationStatus: VerificationStatus;
  verifiedAt: Timestamp | null;
  verificationDocuments?: string[];
  rejectionReason?: string;
  featured: boolean;
  profileCompleteness: number;
  profileViews: number;
  websiteClicks: number;
  favorites: number;
  followers: number;
  averageRating: number;
  reviewCount: number;
  newVendorBoostExpires: Timestamp;
  lastActiveAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VendorInput {
  businessName: string;
  tagline?: string;
  description?: string;
  nation?: string;
  nationId?: string;
  additionalNations?: string[];
  website?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  coverImage?: string;
  gallery?: GalleryImage[];
  videoUrl?: string;
  categories?: string[];
  categoryIds?: string[];
  materials?: string[];
  techniques?: string[];
  priceRange?: PriceRange;
  acceptsCustomOrders?: boolean;
  madeToOrder?: boolean;
  serviceDelivery?: ServiceDelivery;
  location?: Partial<VendorLocation>;
  socialLinks?: Partial<VendorSocialLinks>;
}

export interface VendorFilters {
  category?: string | string[];
  nation?: string | string[];
  region?: string;
  priceRange?: PriceRange;
  materials?: string[];
  techniques?: string[];
  serviceDelivery?: ServiceDelivery;
  customOrdersOnly?: boolean;
  searchQuery?: string;
}

export type VendorSortOption = "newest" | "popular" | "alphabetical";

export interface PaginationOptions {
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  sortBy?: VendorSortOption;
}

export interface VendorListResult {
  vendors: Vendor[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export interface SearchOptions {
  limit?: number;
  filters?: VendorFilters;
}

export interface SearchResults {
  vendors: Vendor[];
  total: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VENDORS_COLLECTION = "vendors";
const DEFAULT_PAGE_LIMIT = 12;
const NEW_VENDOR_BOOST_DAYS = 90;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(businessName: string): string {
  const baseSlug = slugify(businessName);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

/**
 * Calculate profile completeness percentage based on filled fields
 */
function calculateProfileCompleteness(data: Partial<VendorInput>): number {
  const weights: Record<string, number> = {
    businessName: 10,
    tagline: 5,
    description: 15,
    nation: 10,
    website: 15,
    profileImage: 10,
    coverImage: 10,
    gallery: 10, // At least 3 images
    categories: 5,
    location: 10,
  };

  let score = 0;

  if (data.businessName && data.businessName.trim()) score += weights.businessName;
  if (data.tagline && data.tagline.trim()) score += weights.tagline;
  if (data.description && data.description.trim().length >= 50) score += weights.description;
  if (data.nation || data.nationId) score += weights.nation;
  if (data.website && data.website.trim()) score += weights.website;
  if (data.profileImage && data.profileImage.trim()) score += weights.profileImage;
  if (data.coverImage && data.coverImage.trim()) score += weights.coverImage;
  if (data.gallery && data.gallery.length >= 3) score += weights.gallery;
  if (data.categories && data.categories.length > 0) score += weights.categories;
  if (data.location && data.location.city && data.location.province) score += weights.location;

  return score;
}

// ============================================================================
// VENDOR CRUD OPERATIONS
// ============================================================================

/**
 * Create a new vendor profile
 */
export async function createVendor(
  userId: string,
  data: VendorInput
): Promise<Vendor> {
  const firestore = checkFirebase();

  // Generate unique slug from business name
  const slug = generateUniqueSlug(data.businessName);

  // Calculate new vendor boost expiration (90 days from now)
  const boostExpires = Timestamp.fromDate(
    new Date(Date.now() + NEW_VENDOR_BOOST_DAYS * 24 * 60 * 60 * 1000)
  );

  const profileCompleteness = calculateProfileCompleteness(data);

  const vendor: Omit<Vendor, "id"> = {
    userId,
    businessName: data.businessName,
    slug,
    tagline: data.tagline || "",
    description: data.description || "",
    nation: data.nation || "",
    nationId: data.nationId || "",
    additionalNations: data.additionalNations || [],
    website: data.website || "",
    email: data.email || "",
    phone: data.phone || "",
    profileImage: data.profileImage || "",
    coverImage: data.coverImage || "",
    gallery: data.gallery || [],
    videoUrl: data.videoUrl || "",
    categories: data.categories || [],
    categoryIds: data.categoryIds || [],
    materials: data.materials || [],
    techniques: data.techniques || [],
    priceRange: data.priceRange || "mid",
    acceptsCustomOrders: data.acceptsCustomOrders ?? false,
    madeToOrder: data.madeToOrder ?? false,
    serviceDelivery: data.serviceDelivery,
    location: {
      city: data.location?.city || "",
      province: data.location?.province || "",
      country: data.location?.country || "USA",
      region: data.location?.region || "",
      coordinates: data.location?.coordinates,
    },
    socialLinks: {
      instagram: data.socialLinks?.instagram,
      facebook: data.socialLinks?.facebook,
      pinterest: data.socialLinks?.pinterest,
      tiktok: data.socialLinks?.tiktok,
      youtube: data.socialLinks?.youtube,
    },
    status: "draft",
    verificationStatus: "pending",
    verifiedAt: null,
    featured: false,
    profileCompleteness,
    profileViews: 0,
    websiteClicks: 0,
    favorites: 0,
    followers: 0,
    averageRating: 0,
    reviewCount: 0,
    newVendorBoostExpires: boostExpires,
    lastActiveAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Use userId as document ID for easy lookup
  const docRef = doc(firestore, VENDORS_COLLECTION, userId);
  await setDoc(docRef, vendor);

  return {
    ...vendor,
    id: userId,
  };
}

/**
 * Get a vendor by their URL slug (only active vendors)
 */
export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("slug", "==", slug),
      where("status", "==", "active"),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const docData = snap.docs[0];
    return {
      id: docData.id,
      ...docData.data(),
    } as Vendor;
  } catch (error) {
    console.error("Error getting vendor by slug:", error);
    return null;
  }
}

/**
 * Get a vendor by their URL slug regardless of status (for owner preview)
 * This allows shop owners to preview their shop even when status is 'draft'
 * Also supports querying by userId/document ID as a fallback for legacy data
 */
export async function getVendorBySlugForPreview(slug: string): Promise<Vendor | null> {
  try {
    const firestore = checkFirebase();
    const collRef = collection(firestore, VENDORS_COLLECTION);

    // First try to query by slug
    const q = query(
      collRef,
      where("slug", "==", slug),
      limit(1)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0];
      return {
        id: docData.id,
        ...docData.data(),
      } as Vendor;
    }

    // If slug query fails, try to get by document ID (userId)
    // This handles legacy data where slug might be empty but document exists
    console.log("[getVendorBySlugForPreview] Slug query failed, trying document ID:", slug);
    const docRef = doc(firestore, VENDORS_COLLECTION, slug);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("[getVendorBySlugForPreview] Found vendor by document ID");
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Vendor;
    }

    return null;
  } catch (error) {
    console.error("Error getting vendor by slug for preview:", error);
    return null;
  }
}

/**
 * Get a vendor by their ID (any status)
 */
export async function getVendorById(id: string): Promise<Vendor | null> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VENDORS_COLLECTION, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as Vendor;
  } catch (error) {
    console.error("Error getting vendor by ID:", error);
    return null;
  }
}

/**
 * Get vendor by owner user ID
 */
export async function getVendorByOwnerId(userId: string): Promise<Vendor | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(ref, where("userId", "==", userId), limit(1));

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    return {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as Vendor;
  } catch (error) {
    console.error("Error getting vendor by owner ID:", error);
    return null;
  }
}

/**
 * Update a vendor profile
 */
export async function updateVendor(
  id: string,
  userId: string,
  data: Partial<VendorInput>
): Promise<Vendor> {
  const firestore = checkFirebase();

  // Verify ownership
  const existingVendor = await getVendorById(id);
  if (!existingVendor) {
    throw new Error("Vendor not found");
  }

  if (existingVendor.userId !== userId) {
    throw new Error("Unauthorized: You do not own this vendor profile");
  }

  // Merge data and recalculate completeness
  const mergedData = {
    ...existingVendor,
    ...data,
    location: {
      ...existingVendor.location,
      ...data.location,
    },
    socialLinks: {
      ...existingVendor.socialLinks,
      ...data.socialLinks,
    },
  };

  const profileCompleteness = calculateProfileCompleteness(mergedData);

  const updates: Record<string, unknown> = {
    ...data,
    profileCompleteness,
    updatedAt: serverTimestamp(),
  };

  // Handle nested objects properly
  if (data.location) {
    updates.location = {
      ...existingVendor.location,
      ...data.location,
    };
  }

  if (data.socialLinks) {
    updates.socialLinks = {
      ...existingVendor.socialLinks,
      ...data.socialLinks,
    };
  }

  const ref = doc(firestore, VENDORS_COLLECTION, id);
  await updateDoc(ref, updates);

  // Fetch and return updated vendor
  const updated = await getVendorById(id);
  if (!updated) {
    throw new Error("Failed to fetch updated vendor");
  }

  return updated;
}

/**
 * Get vendors with filtering and pagination
 */
export async function getVendors(
  filters: VendorFilters = {},
  options: PaginationOptions = {}
): Promise<VendorListResult> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const pageLimit = options.limit || DEFAULT_PAGE_LIMIT;
    const queryConstraints: any[] = [];

    // Always filter for verified and active vendors
    queryConstraints.push(where("verificationStatus", "==", "verified"));
    queryConstraints.push(where("status", "==", "active"));

    // Apply category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category)
        ? filters.category
        : [filters.category];
      if (categories.length === 1) {
        queryConstraints.push(
          where("categoryIds", "array-contains", categories[0])
        );
      }
      // For multiple categories, we'll filter client-side
    }

    // Apply nation filter
    if (filters.nation) {
      const nations = Array.isArray(filters.nation)
        ? filters.nation
        : [filters.nation];
      if (nations.length === 1) {
        queryConstraints.push(where("nationId", "==", nations[0]));
      }
      // For multiple nations, we'll filter client-side
    }

    // Apply region filter
    if (filters.region) {
      queryConstraints.push(where("location.region", "==", filters.region));
    }

    // Apply price range filter
    if (filters.priceRange) {
      queryConstraints.push(where("priceRange", "==", filters.priceRange));
    }

    // Apply service delivery filter
    if (filters.serviceDelivery) {
      queryConstraints.push(
        where("serviceDelivery", "==", filters.serviceDelivery)
      );
    }

    // Apply custom orders filter
    if (filters.customOrdersOnly) {
      queryConstraints.push(where("acceptsCustomOrders", "==", true));
    }

    // Apply sorting
    switch (options.sortBy) {
      case "popular":
        queryConstraints.push(orderBy("profileViews", "desc"));
        break;
      case "alphabetical":
        queryConstraints.push(orderBy("businessName", "asc"));
        break;
      case "newest":
      default:
        queryConstraints.push(orderBy("createdAt", "desc"));
    }

    // Apply pagination cursor
    if (options.startAfterDoc) {
      queryConstraints.push(startAfter(options.startAfterDoc));
    }

    // Fetch one extra to determine if there are more
    queryConstraints.push(limit(pageLimit + 1));

    const q = query(ref, ...queryConstraints);
    const snap = await getDocs(q);

    let vendors = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Vendor[];

    // Client-side filtering for array conditions
    if (filters.category && Array.isArray(filters.category) && filters.category.length > 1) {
      const categoryArray = filters.category as string[];
      vendors = vendors.filter((v) =>
        categoryArray.some((cat: string) => v.categoryIds.includes(cat))
      );
    }

    if (filters.nation && Array.isArray(filters.nation) && filters.nation.length > 1) {
      vendors = vendors.filter((v) =>
        (filters.nation as string[]).includes(v.nationId)
      );
    }

    if (filters.materials && filters.materials.length > 0) {
      vendors = vendors.filter((v) =>
        filters.materials!.some((mat) => v.materials.includes(mat))
      );
    }

    if (filters.techniques && filters.techniques.length > 0) {
      vendors = vendors.filter((v) =>
        filters.techniques!.some((tech) => v.techniques.includes(tech))
      );
    }

    // Check if there are more results
    const hasMore = vendors.length > pageLimit;
    if (hasMore) {
      vendors = vendors.slice(0, pageLimit);
    }

    const lastDoc = snap.docs.length > 0 ? snap.docs[Math.min(snap.docs.length - 1, pageLimit - 1)] : null;

    return {
      vendors,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error("Error getting vendors:", error);
    return {
      vendors: [],
      lastDoc: null,
      hasMore: false,
    };
  }
}

/**
 * Get the featured vendor of the day
 */
export async function getFeaturedVendor(): Promise<Vendor | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    // First, try to get a vendor marked as featured
    const featuredQuery = query(
      ref,
      where("featured", "==", true),
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      limit(1)
    );

    const featuredSnap = await getDocs(featuredQuery);

    if (!featuredSnap.empty) {
      const doc = featuredSnap.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Vendor;
    }

    // Fallback: Get a random verified vendor with high profile completeness
    const fallbackQuery = query(
      ref,
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      where("profileCompleteness", ">=", 80),
      orderBy("profileCompleteness", "desc"),
      limit(10)
    );

    const fallbackSnap = await getDocs(fallbackQuery);

    if (fallbackSnap.empty) {
      return null;
    }

    // Pick a random one from the top 10
    const randomIndex = Math.floor(Math.random() * fallbackSnap.docs.length);
    const randomDoc = fallbackSnap.docs[randomIndex];

    return {
      id: randomDoc.id,
      ...randomDoc.data(),
    } as Vendor;
  } catch (error) {
    console.error("Error getting featured vendor:", error);
    return null;
  }
}

/**
 * Increment profile view count
 */
export async function incrementProfileView(vendorId: string): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VENDORS_COLLECTION, vendorId);

    await updateDoc(ref, {
      profileViews: increment(1),
      lastActiveAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error incrementing profile view:", error);
  }
}

/**
 * Increment website click count
 */
export async function incrementWebsiteClick(vendorId: string): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VENDORS_COLLECTION, vendorId);

    await updateDoc(ref, {
      websiteClicks: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing website click:", error);
  }
}

/**
 * Search vendors by query string
 */
export async function searchVendors(
  queryStr: string,
  searchLimit: number = 20
): Promise<Vendor[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    // Normalize query
    const normalizedQuery = queryStr.toLowerCase().trim();

    if (!normalizedQuery) {
      return [];
    }

    // Due to Firestore limitations, we'll fetch active vendors and filter client-side
    // In production, consider using Algolia, Typesense, or Meilisearch for better search
    const q = query(
      ref,
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      orderBy("profileViews", "desc"),
      limit(100) // Fetch more to filter
    );

    const snap = await getDocs(q);

    const vendors = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((vendor: any) => {
        const businessNameMatch = vendor.businessName
          ?.toLowerCase()
          .includes(normalizedQuery);
        const nationMatch = vendor.nation
          ?.toLowerCase()
          .includes(normalizedQuery);
        const categoryMatch = vendor.categories?.some((cat: string) =>
          cat.toLowerCase().includes(normalizedQuery)
        );
        const taglineMatch = vendor.tagline
          ?.toLowerCase()
          .includes(normalizedQuery);
        const descriptionMatch = vendor.description
          ?.toLowerCase()
          .includes(normalizedQuery);

        return (
          businessNameMatch ||
          nationMatch ||
          categoryMatch ||
          taglineMatch ||
          descriptionMatch
        );
      })
      .slice(0, searchLimit) as Vendor[];

    return vendors;
  } catch (error) {
    console.error("Error searching vendors:", error);
    return [];
  }
}

/**
 * Get new vendors (within boost period)
 */
export async function getNewVendors(vendorLimit: number = 6): Promise<Vendor[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const now = Timestamp.now();

    const q = query(
      ref,
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      where("newVendorBoostExpires", ">", now),
      orderBy("newVendorBoostExpires", "desc"),
      orderBy("createdAt", "desc"),
      limit(vendorLimit)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Vendor[];
  } catch (error) {
    console.error("Error getting new vendors:", error);
    return [];
  }
}

/**
 * Get popular vendors (by profile views)
 */
export async function getPopularVendors(vendorLimit: number = 6): Promise<Vendor[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      orderBy("profileViews", "desc"),
      limit(vendorLimit)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Vendor[];
  } catch (error) {
    console.error("Error getting popular vendors:", error);
    return [];
  }
}

/**
 * Get vendors by nation
 */
export async function getVendorsByNation(
  nationId: string,
  excludeVendorId?: string,
  vendorLimit: number = 4
): Promise<Vendor[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("nationId", "==", nationId),
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      orderBy("profileViews", "desc"),
      limit(vendorLimit + 1) // Extra to allow excluding one
    );

    const snap = await getDocs(q);

    let vendors = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Vendor[];

    if (excludeVendorId) {
      vendors = vendors.filter((v) => v.id !== excludeVendorId);
    }

    return vendors.slice(0, vendorLimit);
  } catch (error) {
    console.error("Error getting vendors by nation:", error);
    return [];
  }
}

/**
 * Get vendors by category
 */
export async function getVendorsByCategory(
  categoryId: string,
  excludeVendorId?: string,
  vendorLimit: number = 4
): Promise<Vendor[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("categoryIds", "array-contains", categoryId),
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active"),
      orderBy("profileViews", "desc"),
      limit(vendorLimit + 1)
    );

    const snap = await getDocs(q);

    let vendors = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Vendor[];

    if (excludeVendorId) {
      vendors = vendors.filter((v) => v.id !== excludeVendorId);
    }

    return vendors.slice(0, vendorLimit);
  } catch (error) {
    console.error("Error getting vendors by category:", error);
    return [];
  }
}

/**
 * Update vendor status
 */
export async function updateVendorStatus(
  vendorId: string,
  status: VendorStatus
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VENDORS_COLLECTION, vendorId);

    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating vendor status:", error);
    throw error;
  }
}

/**
 * Update vendor verification status (admin only)
 */
export async function updateVerificationStatus(
  vendorId: string,
  status: VerificationStatus,
  rejectionReason?: string
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VENDORS_COLLECTION, vendorId);

    const updates: Record<string, unknown> = {
      verificationStatus: status,
      updatedAt: serverTimestamp(),
    };

    if (status === "verified") {
      updates.verifiedAt = serverTimestamp();
    } else if (status === "rejected" && rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }

    await updateDoc(ref, updates);
  } catch (error) {
    console.error("Error updating verification status:", error);
    throw error;
  }
}

/**
 * Get vendor by user ID
 */
export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  return getVendorById(userId);
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(ref, where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);

    return snap.empty;
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return false;
  }
}

/**
 * Update vendor slug (with uniqueness check)
 */
export async function updateVendorSlug(
  vendorId: string,
  userId: string,
  newSlug: string
): Promise<void> {
  const baseSlug = slugify(newSlug);

  // Check if slug is available
  const available = await isSlugAvailable(baseSlug);

  if (!available) {
    throw new Error("Slug is already taken");
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor || vendor.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const firestore = checkFirebase();
  const ref = doc(firestore, VENDORS_COLLECTION, vendorId);

  await updateDoc(ref, {
    slug: baseSlug,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get vendor count for a category
 */
export async function getCategoryVendorCount(categoryId: string): Promise<number> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("categoryIds", "array-contains", categoryId),
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active")
    );

    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("Error getting category vendor count:", error);
    return 0;
  }
}

/**
 * Get vendor count for a nation
 */
export async function getNationVendorCount(nationId: string): Promise<number> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VENDORS_COLLECTION);

    const q = query(
      ref,
      where("nationId", "==", nationId),
      where("verificationStatus", "==", "verified"),
      where("status", "==", "active")
    );

    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("Error getting nation vendor count:", error);
    return 0;
  }
}
