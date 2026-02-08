// Universal Organization Profile - Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  db,
  employerCollection,
  checkFirebase,
  limit,
} from "./shared";
import type {
  OrganizationProfile,
  OrgType,
  OrganizationStatus,
  OrganizationModule,
  ExtendedSocialLinks,
  PrimaryCTAType,
  EmployerProfile,
} from "@/lib/types";
import { removeDirectoryEntry } from "./directory";

// ============================================
// SLUG UTILITIES
// ============================================

/**
 * Generate URL-friendly slug from organization name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Generate unique slug with random suffix
 */
export function generateUniqueSlug(name: string): string {
  const baseSlug = generateSlug(name);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string, excludeOrgId?: string): Promise<boolean> {
  const firestore = checkFirebase();
  if (!firestore) return true;

  const q = query(
    collection(firestore, employerCollection),
    where("slug", "==", slug),
    limit(1)
  );
  const snap = await getDocs(q);

  if (snap.empty) return true;
  if (excludeOrgId && snap.docs[0].id === excludeOrgId) return true;
  return false;
}

/**
 * Get organization by slug or document ID
 * First tries lookup by slug field, then falls back to document ID
 */
export async function getOrganizationBySlug(slug: string): Promise<OrganizationProfile | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  // First try: lookup by slug field
  const q = query(
    collection(firestore, employerCollection),
    where("slug", "==", slug),
    limit(1)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as OrganizationProfile;
  }

  // Fallback: try lookup by document ID
  // Wrapped in try-catch because Firestore security rules may block access
  try {
    const ref = doc(firestore, employerCollection, slug);
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OrganizationProfile;
    }
  } catch (error) {
    // Permission denied or other error - document may exist but not accessible
    // Fallback lookup failed - document may not exist or may not be accessible
  }

  return null;
}

// ============================================
// PRIMARY CTA COMPUTATION
// ============================================

/**
 * Compute the primary CTA type based on enabled modules
 * Priority: SELL -> HIRE -> EDUCATE -> HOST -> FUNDING -> WEBSITE
 */
export function computePrimaryCTAType(
  enabledModules?: OrganizationModule[],
  counts?: {
    jobsCount?: number;
    programsCount?: number;
    offeringsCount?: number;
    eventsCount?: number;
    fundingCount?: number;
  }
): PrimaryCTAType {
  const modules = enabledModules || [];

  // Check in priority order, but also verify there's actual content
  if (modules.includes('sell') && (counts?.offeringsCount || 0) > 0) return 'OFFERINGS';
  if (modules.includes('hire') && (counts?.jobsCount || 0) > 0) return 'JOBS';
  if (modules.includes('educate') && (counts?.programsCount || 0) > 0) return 'PROGRAMS';
  if (modules.includes('host') && (counts?.eventsCount || 0) > 0) return 'EVENTS';
  if (modules.includes('funding') && (counts?.fundingCount || 0) > 0) return 'FUNDING';

  // If modules are enabled but no content yet, still show the CTA
  if (modules.includes('sell')) return 'OFFERINGS';
  if (modules.includes('hire')) return 'JOBS';
  if (modules.includes('educate')) return 'PROGRAMS';
  if (modules.includes('host')) return 'EVENTS';
  if (modules.includes('funding')) return 'FUNDING';

  return 'WEBSITE';
}

// ============================================
// ORGANIZATION CRUD
// ============================================

export interface CreateOrganizationInput {
  organizationName: string;
  orgType: OrgType;
  badgePreference?: OrgType | 'AUTO';
  province?: string;
  city?: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  website?: string;
  enabledModules?: OrganizationModule[];
  // Onboarding fields
  territory?: string;
  size?: string;
  yearEstablished?: number;
  sector?: string;
  nation?: string;
  contactEmail?: string;
  contactPhone?: string;
  onboardingComplete?: boolean;
}

/**
 * Create a new organization profile (extends employer profile)
 */
export async function createOrganizationProfile(
  userId: string,
  input: CreateOrganizationInput
): Promise<OrganizationProfile> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  // Generate unique slug
  let slug = generateSlug(input.organizationName);
  let attempts = 0;
  while (!(await isSlugAvailable(slug)) && attempts < 5) {
    slug = generateUniqueSlug(input.organizationName);
    attempts++;
  }

  const profile: Partial<OrganizationProfile> = {
    id: userId,
    userId,
    organizationName: input.organizationName,
    slug,
    orgType: input.orgType,
    province: input.province,
    city: input.city,
    location: input.city?.trim() && input.province?.trim()
      ? `${input.city.trim()}, ${input.province.trim()}`
      : (input.province?.trim() || input.city?.trim() || ""),
    logoUrl: input.logoUrl || "",
    bannerUrl: input.bannerUrl || "",
    description: input.description || "",
    publicationStatus: "DRAFT",
    directoryVisible: true,
    enabledModules: input.enabledModules || [],
    links: input.website ? { website: input.website } : {},
    status: "pending",
    ...(input.territory && { territory: input.territory }),
    ...(input.size && { size: input.size }),
    ...(input.yearEstablished && { yearEstablished: input.yearEstablished }),
    ...(input.sector && { sector: input.sector }),
    ...(input.nation && { nation: input.nation }),
    ...(input.contactEmail && { contactEmail: input.contactEmail }),
    ...(input.contactPhone && { contactPhone: input.contactPhone }),
    ...(input.onboardingComplete !== undefined && { onboardingComplete: input.onboardingComplete }),
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const ref = doc(firestore, employerCollection, userId);
  await setDoc(ref, profile);

  return { ...profile, id: userId } as OrganizationProfile;
}

/**
 * Update organization profile
 */
export async function updateOrganizationProfile(
  userId: string,
  updates: Partial<Omit<OrganizationProfile, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  // If organizationName changed and slug not explicitly set, regenerate slug
  if (updates.organizationName && !updates.slug) {
    const existing = await getDoc(ref);
    const currentSlug = existing.exists() ? existing.data().slug : null;
    if (!currentSlug) {
      let slug = generateSlug(updates.organizationName);
      if (!(await isSlugAvailable(slug, userId))) {
        slug = generateUniqueSlug(updates.organizationName);
      }
      updates.slug = slug;
    }
  }

  // Update location string from city/province (with trimming)
  if (updates.city !== undefined || updates.province !== undefined) {
    const existing = await getDoc(ref);
    const data = existing.exists() ? existing.data() : {};
    const city = (updates.city ?? data.city ?? "").trim();
    const province = (updates.province ?? data.province ?? "").trim();
    updates.location = city && province ? `${city}, ${province}` : province || city || "";
  }

  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Validate intro video URL (YouTube or Vimeo only)
 * Returns null if valid, error message if invalid
 */
export function validateIntroVideoUrl(url: string): string | null {
  if (!url || url.trim() === '') {
    return null; // Empty is allowed (removing video)
  }

  const trimmedUrl = url.trim();

  // Check for YouTube URLs
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
  ];

  // Check for Vimeo URLs
  const vimeoPatterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
  ];

  const isYouTube = youtubePatterns.some(p => p.test(trimmedUrl));
  const isVimeo = vimeoPatterns.some(p => p.test(trimmedUrl));

  if (!isYouTube && !isVimeo) {
    return 'Please enter a valid YouTube or Vimeo URL';
  }

  return null;
}

/**
 * Detect video provider from URL
 */
export function detectVideoProvider(url: string): 'youtube' | 'vimeo' | null {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return null;
}

/**
 * Publish organization profile
 */
export async function publishOrganizationProfile(userId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  await updateDoc(ref, {
    publicationStatus: "PUBLISHED",
    directoryVisible: true,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Unpublish organization profile
 */
export async function unpublishOrganizationProfile(userId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  await updateDoc(ref, {
    publicationStatus: "DRAFT",
    directoryVisible: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggle directory visibility (without changing publication status)
 */
export async function setDirectoryVisibility(userId: string, visible: boolean): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  await updateDoc(ref, {
    directoryVisible: visible,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get organization profile by ID
 */
export async function getOrganizationProfile(userId: string): Promise<OrganizationProfile | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  // First try: look up by document ID
  const ref = doc(firestore, employerCollection, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as OrganizationProfile;
  }

  // Second try: query by userId field
  const q = query(
    collection(firestore, employerCollection),
    where("userId", "==", userId)
  );
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const docSnap = querySnap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as OrganizationProfile;
  }

  return null;
}

/**
 * Get public organization profile by slug or document ID (only returns published & visible)
 * First tries lookup by slug field, then falls back to document ID
 */
export async function getPublicOrganizationBySlug(slug: string): Promise<OrganizationProfile | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  // First try: lookup by slug field with full publication check
  const q = query(
    collection(firestore, employerCollection),
    where("slug", "==", slug),
    where("publicationStatus", "==", "PUBLISHED"),
    where("status", "==", "approved"), // Required by Firestore security rules
    limit(1)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as OrganizationProfile;
  }

  // Second try: lookup by slug with only approved status
  // If status is approved, show the profile regardless of publicationStatus
  // (publicationStatus may not have been updated when admin approved)
  const fallbackQuery = query(
    collection(firestore, employerCollection),
    where("slug", "==", slug),
    where("status", "==", "approved"),
    limit(1)
  );
  const fallbackSnap = await getDocs(fallbackQuery);

  if (!fallbackSnap.empty) {
    const docSnap = fallbackSnap.docs[0];
    const data = docSnap.data();
    // Approved status is the source of truth - show profile
    return { id: docSnap.id, ...data } as OrganizationProfile;
  }

  // Third try: lookup by document ID (in case slug IS the document ID)
  // Wrapped in try-catch because Firestore security rules may block access
  try {
    const ref = doc(firestore, employerCollection, slug);
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Approved status is the source of truth
      if (data.status === "approved") {
        return { id: docSnap.id, ...data } as OrganizationProfile;
      }
    }
  } catch (error) {
    // Permission denied or other error - document may exist but not accessible
    // Doc ID lookup failed - document may not exist or may not be accessible
  }

  return null;
}

/**
 * List published organizations (for directory)
 *
 * Visibility rules:
 * - Must be approved (status === 'approved')
 * - Must be directory visible (isDirectoryVisible === true)
 *   This is computed from: isGrandfathered OR directoryVisibleUntil > now
 *
 * Note: isDirectoryVisible is server-computed based on engagement (subscriptions, jobs, etc.)
 */
export async function listPublishedOrganizations(
  limitCount: number = 50
): Promise<OrganizationProfile[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  const q = query(
    collection(firestore, employerCollection),
    where("status", "==", "approved"), // Required by Firestore security rules
    where("isDirectoryVisible", "==", true), // Computed visibility based on engagement
    orderBy("organizationName", "asc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as OrganizationProfile[];
}

// ============================================
// MODULE MANAGEMENT
// ============================================

/**
 * Enable a module for an organization
 */
export async function enableOrganizationModule(
  userId: string,
  module: OrganizationModule
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Organization not found");

  const data = snap.data();
  const currentModules = data.enabledModules || [];

  if (!currentModules.includes(module)) {
    await updateDoc(ref, {
      enabledModules: [...currentModules, module],
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Disable a module for an organization
 */
export async function disableOrganizationModule(
  userId: string,
  module: OrganizationModule
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Organization not found");

  const data = snap.data();
  const currentModules = data.enabledModules || [];

  await updateDoc(ref, {
    enabledModules: currentModules.filter((m: OrganizationModule) => m !== module),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Set enabled modules (replace all)
 */
export async function setOrganizationModules(
  userId: string,
  modules: OrganizationModule[]
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  await updateDoc(ref, {
    enabledModules: modules,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// LINKS & CONTACT MANAGEMENT
// ============================================

/**
 * Update organization links
 */
export async function updateOrganizationLinks(
  userId: string,
  links: ExtendedSocialLinks
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);

  await updateDoc(ref, {
    links,
    // Also update legacy fields for backward compatibility
    website: links.website || "",
    contactEmail: links.email || "",
    contactPhone: links.phone || "",
    socialLinks: {
      linkedin: links.linkedin,
      twitter: links.twitter,
      facebook: links.facebook,
      instagram: links.instagram,
    },
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Migrate an existing employer profile to organization profile format
 */
export async function migrateToOrganizationProfile(
  userId: string,
  orgType: OrgType = "EMPLOYER"
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, employerCollection, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Profile not found");

  const data = snap.data() as EmployerProfile;

  // Only migrate if not already migrated
  if ((data as any).slug) {
    return; // Already migrated
  }

  // Generate slug
  let slug = generateSlug(data.organizationName);
  if (!(await isSlugAvailable(slug, userId))) {
    slug = generateUniqueSlug(data.organizationName);
  }

  // Parse location into province/city
  let province = "";
  let city = "";
  if (data.location) {
    const parts = data.location.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      city = parts[0];
      province = parts[1];
    } else {
      province = parts[0];
    }
  }

  // Build links from existing fields
  const links: ExtendedSocialLinks = {
    website: data.website,
    email: data.contactEmail,
    phone: data.contactPhone,
    linkedin: data.socialLinks?.linkedin,
    twitter: data.socialLinks?.twitter,
    facebook: data.socialLinks?.facebook,
    instagram: data.socialLinks?.instagram,
  };

  // Determine publication status
  const publicationStatus: OrganizationStatus =
    data.status === "approved" ? "PUBLISHED" : "DRAFT";
  const directoryVisible = publicationStatus === "PUBLISHED";

  await updateDoc(ref, {
    slug,
    orgType,
    province,
    city,
    links,
    publicationStatus,
    directoryVisible,
    publishedAt: publicationStatus === "PUBLISHED" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if an employer profile needs migration to organization format
 */
export function needsMigration(profile: EmployerProfile | OrganizationProfile): boolean {
  return !(profile as OrganizationProfile).slug;
}

// ============================================
// SOFT DELETE
// ============================================

export interface SoftDeleteResult {
  success: boolean;
  orgId: string;
  organizationName?: string;
  error?: string;
}

/**
 * Soft delete an organization profile
 * - Sets status to 'deleted'
 * - Sets directoryVisible to false
 * - Removes from directory_index
 * - Records deletion metadata
 *
 * This is the shared function used by both employer self-delete and admin delete.
 */
export async function softDeleteOrganization(
  orgId: string,
  deletedBy: string,
  reason?: string
): Promise<SoftDeleteResult> {
  const firestore = checkFirebase();
  if (!firestore) {
    return { success: false, orgId, error: "Firebase not available" };
  }

  try {
    const ref = doc(firestore, employerCollection, orgId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { success: false, orgId, error: "Organization not found" };
    }

    const data = snap.data();
    const organizationName = data.organizationName;

    // Check if already deleted
    if (data.status === "deleted") {
      return { success: false, orgId, organizationName, error: "Organization already deleted" };
    }

    // Update the organization document with soft-delete fields
    await updateDoc(ref, {
      status: "deleted",
      directoryVisible: false,
      publicationStatus: "DRAFT", // Unpublish
      deletedAt: serverTimestamp(),
      deletedBy,
      deleteReason: reason || null,
      updatedAt: serverTimestamp(),
    });

    // Remove from directory index
    await removeDirectoryEntry(orgId);

    return { success: true, orgId, organizationName };
  } catch (error) {
    console.error(`[softDeleteOrganization] Error deleting ${orgId}:`, error);
    return {
      success: false,
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if an organization is deleted (soft-deleted)
 */
export function isOrganizationDeleted(profile: OrganizationProfile): boolean {
  return profile.status === "deleted" || !!profile.deletedAt;
}
