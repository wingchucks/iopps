/**
 * Shop Indigenous Verification Operations
 *
 * Manages vendor verification requests and status.
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVendor } from "./shop";
import type { Vendor } from "@/lib/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type VerificationRequestStatus = "pending" | "approved" | "rejected" | "more_info_needed";

export interface VerificationRequest {
  id: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  requestedBy: string;
  status: VerificationRequestStatus;
  documents: VerificationDocument[];
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  additionalInfoRequest?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerificationDocument {
  type: "tribal_id" | "business_license" | "enrollment_document" | "letter_of_support" | "other";
  url: string;
  name: string;
  uploadedAt: Timestamp;
}

export interface VerificationCriteria {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VERIFICATION_COLLECTION = "verificationRequests";

export const VERIFICATION_CRITERIA: VerificationCriteria[] = [
  {
    id: "tribal_enrollment",
    name: "Tribal Enrollment",
    description: "Proof of enrollment or membership in a federally recognized tribe",
    required: true,
  },
  {
    id: "business_docs",
    name: "Business Documentation",
    description: "Business license, registration, or other official business documentation",
    required: false,
  },
  {
    id: "letter_of_support",
    name: "Letter of Support",
    description: "Letter from tribal council, elder, or community leader",
    required: false,
  },
  {
    id: "heritage_documentation",
    name: "Heritage Documentation",
    description: "Documentation of Indigenous heritage or lineage",
    required: false,
  },
];

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
// VERIFICATION REQUEST OPERATIONS
// ============================================================================

/**
 * Submit a verification request
 */
export async function submitVerificationRequest(
  vendorId: string,
  documents: VerificationDocument[],
  notes?: string
): Promise<string | null> {
  try {
    const firestore = checkFirebase();

    // Get vendor details
    const vendor = await getVendor(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check if there's already a pending request
    const existingRequest = await getPendingVerificationRequest(vendorId);
    if (existingRequest) {
      throw new Error("A verification request is already pending");
    }

    // Create the request
    const ref = collection(firestore, VERIFICATION_COLLECTION);
    const docRef = doc(ref);

    await setDoc(docRef, {
      vendorId,
      vendorSlug: vendor.slug,
      vendorName: vendor.businessName,
      requestedBy: vendor.userId,
      status: "pending",
      documents,
      notes: notes || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update vendor verification status directly (not through VendorInput)
    const vendorRef = doc(db!, "vendors", vendorId);
    await updateDoc(vendorRef, {
      verificationStatus: "pending",
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error submitting verification request:", error);
    return null;
  }
}

/**
 * Get a pending verification request for a vendor
 */
export async function getPendingVerificationRequest(
  vendorId: string
): Promise<VerificationRequest | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VERIFICATION_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      where("status", "==", "pending"),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    return {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as VerificationRequest;
  } catch (error) {
    console.error("Error getting pending verification request:", error);
    return null;
  }
}

/**
 * Get all verification requests for a vendor
 */
export async function getVendorVerificationHistory(
  vendorId: string
): Promise<VerificationRequest[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VERIFICATION_COLLECTION);

    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as VerificationRequest[];
  } catch (error) {
    console.error("Error getting vendor verification history:", error);
    return [];
  }
}

/**
 * Get all pending verification requests (admin)
 */
export async function getPendingVerificationRequests(): Promise<VerificationRequest[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, VERIFICATION_COLLECTION);

    const q = query(
      ref,
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as VerificationRequest[];
  } catch (error) {
    console.error("Error getting pending verification requests:", error);
    return [];
  }
}

/**
 * Approve a verification request (admin)
 */
export async function approveVerificationRequest(
  requestId: string,
  reviewerId: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VERIFICATION_COLLECTION, requestId);

    // Get the request
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }

    const request = snap.data() as VerificationRequest;

    // Update the request
    await updateDoc(ref, {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update vendor verification status directly
    const vendorRef = doc(firestore, "vendors", request.vendorId);
    await updateDoc(vendorRef, {
      verificationStatus: "verified",
      verifiedAt: Timestamp.now(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error approving verification request:", error);
    return false;
  }
}

/**
 * Reject a verification request (admin)
 */
export async function rejectVerificationRequest(
  requestId: string,
  reviewerId: string,
  reason: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VERIFICATION_COLLECTION, requestId);

    // Get the request
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }

    const request = snap.data() as VerificationRequest;

    // Update the request
    await updateDoc(ref, {
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Update vendor verification status directly
    const vendorRef = doc(firestore, "vendors", request.vendorId);
    await updateDoc(vendorRef, {
      verificationStatus: "rejected",
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error rejecting verification request:", error);
    return false;
  }
}

/**
 * Request additional information (admin)
 */
export async function requestAdditionalInfo(
  requestId: string,
  reviewerId: string,
  infoRequest: string
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VERIFICATION_COLLECTION, requestId);

    await updateDoc(ref, {
      status: "more_info_needed",
      reviewedBy: reviewerId,
      additionalInfoRequest: infoRequest,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error requesting additional info:", error);
    return false;
  }
}

/**
 * Add additional documents to a request
 */
export async function addDocumentsToRequest(
  requestId: string,
  documents: VerificationDocument[]
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VERIFICATION_COLLECTION, requestId);

    // Get current request
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }

    const current = snap.data() as VerificationRequest;

    // Add new documents
    await updateDoc(ref, {
      documents: [...current.documents, ...documents],
      status: "pending",
      additionalInfoRequest: null,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error adding documents to request:", error);
    return false;
  }
}

/**
 * Get verification request by ID
 */
export async function getVerificationRequest(
  requestId: string
): Promise<VerificationRequest | null> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, VERIFICATION_COLLECTION, requestId);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as VerificationRequest;
  } catch (error) {
    console.error("Error getting verification request:", error);
    return null;
  }
}

/**
 * Revoke vendor verification (admin)
 */
export async function revokeVerification(
  vendorId: string,
  reason: string
): Promise<boolean> {
  try {
    if (!db) throw new Error("Firebase not initialized");
    const vendorRef = doc(db, "vendors", vendorId);
    await updateDoc(vendorRef, {
      verificationStatus: "rejected",
      verifiedAt: null,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error revoking verification:", error);
    return false;
  }
}
