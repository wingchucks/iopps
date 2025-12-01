/**
 * Shop Indigenous Follows Operations
 *
 * Manages user follows for vendors. Following differs from favoriting:
 * - Favorites are for quick access/bookmarking
 * - Following is for receiving updates/notifications
 *
 * Follows require authentication (no guest follows).
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
  serverTimestamp,
  updateDoc,
  increment,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Follow {
  id: string;
  userId: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
  notifications: boolean;
  createdAt: Timestamp;
}

export interface FollowInput {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
  notifications?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FOLLOWS_COLLECTION = "follows";
const VENDORS_COLLECTION = "vendors";

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
// FOLLOW OPERATIONS
// ============================================================================

/**
 * Get all follows for a user
 */
export async function getUserFollows(userId: string): Promise<Follow[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FOLLOWS_COLLECTION);

    const q = query(
      ref,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Follow[];
  } catch (error) {
    console.error("Error getting user follows:", error);
    return [];
  }
}

/**
 * Get follower count for a vendor
 */
export async function getVendorFollowerCount(vendorId: string): Promise<number> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FOLLOWS_COLLECTION);

    const q = query(ref, where("vendorId", "==", vendorId));
    const snap = await getDocs(q);

    return snap.size;
  } catch (error) {
    console.error("Error getting vendor follower count:", error);
    return 0;
  }
}

/**
 * Get followers for a vendor
 */
export async function getVendorFollowers(
  vendorId: string,
  limit: number = 50
): Promise<{ userId: string; createdAt: Timestamp }[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FOLLOWS_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.slice(0, limit).map((docSnap) => {
      const data = docSnap.data();
      return {
        userId: data.userId,
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.error("Error getting vendor followers:", error);
    return [];
  }
}

/**
 * Follow a vendor
 */
export async function followVendor(
  userId: string,
  vendor: FollowInput
): Promise<string | null> {
  try {
    const firestore = checkFirebase();

    // Create a deterministic ID based on user and vendor
    const followId = `${userId}_${vendor.vendorId}`;
    const followRef = doc(firestore, FOLLOWS_COLLECTION, followId);
    const vendorRef = doc(firestore, VENDORS_COLLECTION, vendor.vendorId);

    // Use transaction to update both follow and vendor follower count
    await runTransaction(firestore, async (transaction) => {
      const existingFollow = await transaction.get(followRef);

      if (existingFollow.exists()) {
        // Already following
        return;
      }

      // Create follow document
      transaction.set(followRef, {
        userId,
        vendorId: vendor.vendorId,
        vendorSlug: vendor.vendorSlug,
        vendorName: vendor.vendorName,
        vendorImage: vendor.vendorImage || null,
        notifications: vendor.notifications ?? true,
        createdAt: serverTimestamp(),
      });

      // Increment vendor follower count
      transaction.update(vendorRef, {
        followers: increment(1),
      });
    });

    return followId;
  } catch (error) {
    console.error("Error following vendor:", error);
    return null;
  }
}

/**
 * Unfollow a vendor
 */
export async function unfollowVendor(
  userId: string,
  vendorId: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();

    const followId = `${userId}_${vendorId}`;
    const followRef = doc(firestore, FOLLOWS_COLLECTION, followId);
    const vendorRef = doc(firestore, VENDORS_COLLECTION, vendorId);

    // Use transaction to update both follow and vendor follower count
    await runTransaction(firestore, async (transaction) => {
      const existingFollow = await transaction.get(followRef);

      if (!existingFollow.exists()) {
        // Not following
        return;
      }

      // Delete follow document
      transaction.delete(followRef);

      // Decrement vendor follower count
      transaction.update(vendorRef, {
        followers: increment(-1),
      });
    });

    return true;
  } catch (error) {
    console.error("Error unfollowing vendor:", error);
    return false;
  }
}

/**
 * Check if user is following a vendor
 */
export async function isFollowing(
  userId: string,
  vendorId: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const followId = `${userId}_${vendorId}`;
    const ref = doc(firestore, FOLLOWS_COLLECTION, followId);

    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

/**
 * Toggle follow status
 */
export async function toggleFollow(
  userId: string,
  vendor: FollowInput
): Promise<boolean> {
  const isCurrentlyFollowing = await isFollowing(userId, vendor.vendorId);

  if (isCurrentlyFollowing) {
    await unfollowVendor(userId, vendor.vendorId);
    return false;
  } else {
    await followVendor(userId, vendor);
    return true;
  }
}

/**
 * Update notification preferences for a follow
 */
export async function updateFollowNotifications(
  userId: string,
  vendorId: string,
  notifications: boolean
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const followId = `${userId}_${vendorId}`;
    const ref = doc(firestore, FOLLOWS_COLLECTION, followId);

    await updateDoc(ref, { notifications });
    return true;
  } catch (error) {
    console.error("Error updating follow notifications:", error);
    return false;
  }
}

/**
 * Get follow details
 */
export async function getFollowDetails(
  userId: string,
  vendorId: string
): Promise<Follow | null> {
  try {
    const firestore = checkFirebase();
    const followId = `${userId}_${vendorId}`;
    const ref = doc(firestore, FOLLOWS_COLLECTION, followId);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as Follow;
  } catch (error) {
    console.error("Error getting follow details:", error);
    return null;
  }
}

/**
 * Get followed vendor IDs for quick lookup
 */
export async function getFollowedVendorIds(userId: string): Promise<Set<string>> {
  const follows = await getUserFollows(userId);
  return new Set(follows.map((f) => f.vendorId));
}

/**
 * Get users who should receive notifications for a vendor update
 */
export async function getVendorNotificationRecipients(
  vendorId: string
): Promise<string[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FOLLOWS_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      where("notifications", "==", true)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => docSnap.data().userId);
  } catch (error) {
    console.error("Error getting notification recipients:", error);
    return [];
  }
}

/**
 * Batch check if user is following multiple vendors
 */
export async function checkFollowingMultiple(
  userId: string,
  vendorIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  if (vendorIds.length === 0) {
    return result;
  }

  try {
    const firestore = checkFirebase();
    const follows = await getUserFollows(userId);
    const followedSet = new Set(follows.map((f) => f.vendorId));

    for (const vendorId of vendorIds) {
      result.set(vendorId, followedSet.has(vendorId));
    }

    return result;
  } catch (error) {
    console.error("Error batch checking follows:", error);
    // Return all false on error
    for (const vendorId of vendorIds) {
      result.set(vendorId, false);
    }
    return result;
  }
}
