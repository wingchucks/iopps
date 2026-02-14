/**
 * Shop Indigenous Favorites Operations
 *
 * Manages user favorites for vendors with support for:
 * - Guest favorites using localStorage
 * - Authenticated favorites in Firestore
 * - Syncing guest favorites when user logs in
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Favorite {
  id: string;
  userId: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
  createdAt: Timestamp;
}

export interface GuestFavorite {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
  createdAt: number; // timestamp
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FAVORITES_COLLECTION = "favorites";
const GUEST_FAVORITES_KEY = "shop_indigenous_favorites";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

// ============================================================================
// GUEST FAVORITES (localStorage)
// ============================================================================

/**
 * Get guest favorites from localStorage
 */
export function getGuestFavorites(): GuestFavorite[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading guest favorites:", error);
    return [];
  }
}

/**
 * Add a vendor to guest favorites
 */
export function addGuestFavorite(vendor: {
  id: string;
  slug: string;
  businessName: string;
  profileImage?: string;
}): GuestFavorite[] {
  if (typeof window === "undefined") return [];

  try {
    const favorites = getGuestFavorites();

    // Check if already favorited
    if (favorites.some((f) => f.vendorId === vendor.id)) {
      return favorites;
    }

    const newFavorite: GuestFavorite = {
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      vendorName: vendor.businessName,
      vendorImage: vendor.profileImage,
      createdAt: Date.now(),
    };

    const updated = [newFavorite, ...favorites];
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(updated));

    return updated;
  } catch (error) {
    console.error("Error adding guest favorite:", error);
    return getGuestFavorites();
  }
}

/**
 * Remove a vendor from guest favorites
 */
export function removeGuestFavorite(vendorId: string): GuestFavorite[] {
  if (typeof window === "undefined") return [];

  try {
    const favorites = getGuestFavorites();
    const updated = favorites.filter((f) => f.vendorId !== vendorId);
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error removing guest favorite:", error);
    return getGuestFavorites();
  }
}

/**
 * Check if a vendor is in guest favorites
 */
export function isGuestFavorite(vendorId: string): boolean {
  const favorites = getGuestFavorites();
  return favorites.some((f) => f.vendorId === vendorId);
}

/**
 * Clear all guest favorites
 */
export function clearGuestFavorites(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_FAVORITES_KEY);
}

// ============================================================================
// AUTHENTICATED FAVORITES (Firestore)
// ============================================================================

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FAVORITES_COLLECTION);

    const q = query(
      ref,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Favorite[];
  } catch (error) {
    console.error("Error getting user favorites:", error);
    return [];
  }
}

/**
 * Add a vendor to user's favorites
 */
export async function addUserFavorite(
  userId: string,
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    profileImage?: string;
  }
): Promise<string | null> {
  try {
    const firestore = checkFirebase();

    // Create a deterministic ID based on user and vendor
    const favoriteId = `${userId}_${vendor.id}`;
    const ref = doc(firestore, FAVORITES_COLLECTION, favoriteId);

    // Check if already exists
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return favoriteId;
    }

    await setDoc(ref, {
      userId,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      vendorName: vendor.businessName,
      vendorImage: vendor.profileImage || null,
      createdAt: serverTimestamp(),
    });

    return favoriteId;
  } catch (error) {
    console.error("Error adding user favorite:", error);
    return null;
  }
}

/**
 * Remove a vendor from user's favorites
 */
export async function removeUserFavorite(
  userId: string,
  vendorId: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const favoriteId = `${userId}_${vendorId}`;
    const ref = doc(firestore, FAVORITES_COLLECTION, favoriteId);

    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error("Error removing user favorite:", error);
    return false;
  }
}

/**
 * Check if a vendor is in user's favorites
 */
export async function isUserFavorite(
  userId: string,
  vendorId: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const favoriteId = `${userId}_${vendorId}`;
    const ref = doc(firestore, FAVORITES_COLLECTION, favoriteId);

    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    console.error("Error checking user favorite:", error);
    return false;
  }
}

/**
 * Toggle a vendor's favorite status
 */
export async function toggleUserFavorite(
  userId: string,
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    profileImage?: string;
  }
): Promise<boolean> {
  const isFavorited = await isUserFavorite(userId, vendor.id);

  if (isFavorited) {
    await removeUserFavorite(userId, vendor.id);
    return false;
  } else {
    await addUserFavorite(userId, vendor);
    return true;
  }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync guest favorites to user's Firestore favorites
 * Called when a guest logs in or creates an account
 */
export async function syncGuestFavoritesToUser(userId: string): Promise<number> {
  try {
    const firestore = checkFirebase();
    const guestFavorites = getGuestFavorites();

    if (guestFavorites.length === 0) {
      return 0;
    }

    // Get existing user favorites
    const existingFavorites = await getUserFavorites(userId);
    const existingVendorIds = new Set(existingFavorites.map((f) => f.vendorId));

    // Filter out already-favorited vendors
    const newFavorites = guestFavorites.filter(
      (f) => !existingVendorIds.has(f.vendorId)
    );

    if (newFavorites.length === 0) {
      clearGuestFavorites();
      return 0;
    }

    // Batch write new favorites
    const batch = writeBatch(firestore);

    for (const favorite of newFavorites) {
      const favoriteId = `${userId}_${favorite.vendorId}`;
      const ref = doc(firestore, FAVORITES_COLLECTION, favoriteId);

      batch.set(ref, {
        userId,
        vendorId: favorite.vendorId,
        vendorSlug: favorite.vendorSlug,
        vendorName: favorite.vendorName,
        vendorImage: favorite.vendorImage || null,
        createdAt: Timestamp.fromMillis(favorite.createdAt),
      });
    }

    await batch.commit();

    // Clear guest favorites after sync
    clearGuestFavorites();

    return newFavorites.length;
  } catch (error) {
    console.error("Error syncing guest favorites:", error);
    return 0;
  }
}

// ============================================================================
// COMBINED OPERATIONS (handles both guest and authenticated)
// ============================================================================

/**
 * Get favorites for current context (guest or authenticated)
 */
export async function getFavorites(
  userId?: string | null
): Promise<{ vendorId: string; vendorSlug: string; vendorName: string }[]> {
  if (userId) {
    const favorites = await getUserFavorites(userId);
    return favorites.map((f) => ({
      vendorId: f.vendorId,
      vendorSlug: f.vendorSlug,
      vendorName: f.vendorName,
    }));
  } else {
    return getGuestFavorites().map((f) => ({
      vendorId: f.vendorId,
      vendorSlug: f.vendorSlug,
      vendorName: f.vendorName,
    }));
  }
}

/**
 * Check if vendor is favorited (guest or authenticated)
 */
export async function isFavorited(
  vendorId: string,
  userId?: string | null
): Promise<boolean> {
  if (userId) {
    return isUserFavorite(userId, vendorId);
  } else {
    return isGuestFavorite(vendorId);
  }
}

/**
 * Toggle favorite status (guest or authenticated)
 */
export async function toggleFavorite(
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    profileImage?: string;
  },
  userId?: string | null
): Promise<boolean> {
  if (userId) {
    return toggleUserFavorite(userId, vendor);
  } else {
    const isFav = isGuestFavorite(vendor.id);
    if (isFav) {
      removeGuestFavorite(vendor.id);
      return false;
    } else {
      addGuestFavorite(vendor);
      return true;
    }
  }
}

/**
 * Get favorite vendor IDs for quick lookup
 */
export async function getFavoriteVendorIds(
  userId?: string | null
): Promise<Set<string>> {
  if (userId) {
    const favorites = await getUserFavorites(userId);
    return new Set(favorites.map((f) => f.vendorId));
  } else {
    const favorites = getGuestFavorites();
    return new Set(favorites.map((f) => f.vendorId));
  }
}
