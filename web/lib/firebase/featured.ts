/**
 * Shop Indigenous Featured Rotation Operations
 *
 * Manages the "Business of the Day" feature for highlighting vendors.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVendor } from "./shop";
import type { Vendor } from "@/lib/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeaturedSlot {
  id: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  reason?: string;
  isPaid: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

export interface FeaturedVendorWithDetails extends FeaturedSlot {
  vendor: Vendor;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURED_COLLECTION = "featuredRotation";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

/**
 * Get the start and end of today in Timestamp format
 */
function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// ============================================================================
// FEATURED OPERATIONS
// ============================================================================

/**
 * Get today's featured vendor (Business of the Day)
 */
export async function getTodaysFeaturedVendor(): Promise<FeaturedVendorWithDetails | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);
    const { start, end } = getTodayRange();

    // Query for active featured slot
    const q = query(
      ref,
      where("startDate", "<=", Timestamp.fromDate(end)),
      where("endDate", ">=", Timestamp.fromDate(start)),
      orderBy("startDate", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const slot = {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as FeaturedSlot;

    // Get full vendor details
    const vendor = await getVendor(slot.vendorId);

    if (!vendor || vendor.status !== "active") {
      return null;
    }

    return {
      ...slot,
      vendor,
    };
  } catch (error) {
    console.error("Error getting today's featured vendor:", error);
    return null;
  }
}

/**
 * Get featured vendor for a specific date
 */
export async function getFeaturedVendorByDate(
  date: Date
): Promise<FeaturedVendorWithDetails | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const q = query(
      ref,
      where("startDate", "<=", Timestamp.fromDate(dayEnd)),
      where("endDate", ">=", Timestamp.fromDate(dayStart)),
      orderBy("startDate", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const slot = {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as FeaturedSlot;

    const vendor = await getVendor(slot.vendorId);

    if (!vendor) {
      return null;
    }

    return {
      ...slot,
      vendor,
    };
  } catch (error) {
    console.error("Error getting featured vendor by date:", error);
    return null;
  }
}

/**
 * Get upcoming featured slots
 */
export async function getUpcomingFeaturedSlots(
  limitCount: number = 30
): Promise<FeaturedSlot[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);
    const now = new Date();

    const q = query(
      ref,
      where("endDate", ">=", Timestamp.fromDate(now)),
      orderBy("endDate", "asc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as FeaturedSlot[];
  } catch (error) {
    console.error("Error getting upcoming featured slots:", error);
    return [];
  }
}

/**
 * Get past featured slots
 */
export async function getPastFeaturedSlots(
  limitCount: number = 30
): Promise<FeaturedSlot[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);
    const now = new Date();

    const q = query(
      ref,
      where("endDate", "<", Timestamp.fromDate(now)),
      orderBy("endDate", "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as FeaturedSlot[];
  } catch (error) {
    console.error("Error getting past featured slots:", error);
    return [];
  }
}

/**
 * Check if a date range is available for featuring
 */
export async function checkDateAvailability(
  startDate: Date,
  endDate: Date,
  excludeSlotId?: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);

    // Query for any overlapping slots
    const q = query(
      ref,
      where("startDate", "<=", Timestamp.fromDate(endDate)),
      where("endDate", ">=", Timestamp.fromDate(startDate))
    );

    const snap = await getDocs(q);

    // Filter out the excluded slot if provided
    const conflicts = snap.docs.filter(
      (docSnap) => docSnap.id !== excludeSlotId
    );

    return conflicts.length === 0;
  } catch (error) {
    console.error("Error checking date availability:", error);
    return false;
  }
}

/**
 * Create a new featured slot
 */
export async function createFeaturedSlot(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  options: {
    reason?: string;
    isPaid?: boolean;
    createdBy: string;
  }
): Promise<string | null> {
  try {
    const firestore = checkFirebase();

    // Check availability
    const isAvailable = await checkDateAvailability(startDate, endDate);
    if (!isAvailable) {
      throw new Error("Date range is not available");
    }

    // Get vendor details
    const vendor = await getVendor(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create the slot
    const ref = collection(firestore, FEATURED_COLLECTION);
    const docRef = doc(ref);

    await setDoc(docRef, {
      vendorId,
      vendorSlug: vendor.slug,
      vendorName: vendor.businessName,
      vendorImage: vendor.logoUrl || null,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      reason: options.reason || null,
      isPaid: options.isPaid || false,
      createdBy: options.createdBy,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating featured slot:", error);
    return null;
  }
}

/**
 * Update a featured slot
 */
export async function updateFeaturedSlot(
  slotId: string,
  updates: {
    startDate?: Date;
    endDate?: Date;
    reason?: string;
    isPaid?: boolean;
  }
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, FEATURED_COLLECTION, slotId);

    // Get current slot
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Slot not found");
    }

    const current = snap.data() as FeaturedSlot;

    // Check date availability if dates are changing
    if (updates.startDate || updates.endDate) {
      const newStart = updates.startDate || current.startDate.toDate();
      const newEnd = updates.endDate || current.endDate.toDate();

      const isAvailable = await checkDateAvailability(newStart, newEnd, slotId);
      if (!isAvailable) {
        throw new Error("Date range is not available");
      }
    }

    const updateData: Record<string, any> = {};

    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }
    if (updates.reason !== undefined) {
      updateData.reason = updates.reason;
    }
    if (updates.isPaid !== undefined) {
      updateData.isPaid = updates.isPaid;
    }

    await updateDoc(ref, updateData);
    return true;
  } catch (error) {
    console.error("Error updating featured slot:", error);
    return false;
  }
}

/**
 * Delete a featured slot
 */
export async function deleteFeaturedSlot(slotId: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, FEATURED_COLLECTION, slotId);

    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error("Error deleting featured slot:", error);
    return false;
  }
}

/**
 * Get all featured slots for a vendor
 */
export async function getVendorFeaturedHistory(
  vendorId: string
): Promise<FeaturedSlot[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, FEATURED_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("startDate", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as FeaturedSlot[];
  } catch (error) {
    console.error("Error getting vendor featured history:", error);
    return [];
  }
}

/**
 * Get available dates for the next N days
 */
export async function getAvailableDates(days: number = 60): Promise<Date[]> {
  try {
    const upcomingSlots = await getUpcomingFeaturedSlots(100);
    const bookedDates = new Set<string>();

    // Mark all booked dates
    for (const slot of upcomingSlots) {
      const start = slot.startDate.toDate();
      const end = slot.endDate.toDate();

      const current = new Date(start);
      while (current <= end) {
        bookedDates.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    // Find available dates
    const available: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dateStr = date.toISOString().split("T")[0];
      if (!bookedDates.has(dateStr)) {
        available.push(date);
      }
    }

    return available;
  } catch (error) {
    console.error("Error getting available dates:", error);
    return [];
  }
}
