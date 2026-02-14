/**
 * Member profile Firestore operations (server-side, firebase-admin).
 *
 * Collection: "memberProfiles"
 *
 * All functions use the Firebase Admin SDK and are intended for use
 * in Next.js API routes and server components.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

// ============================================
// COLLECTION NAME
// ============================================

const MEMBER_COLLECTION = "memberProfiles";

// ============================================
// TYPES
// ============================================

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
}

export interface MemberProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  photoURL?: string;
  tagline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  experience?: WorkExperience[];
  experienceSummary?: string;
  education?: Education[];
  educationSummary?: string;
  portfolio?: PortfolioItem[];
  resumeUrl?: string;
  coverLetterTemplate?: string;
  indigenousAffiliation?: string;
  availableForInterviews?: string;
  messagingHandle?: string;
  nation?: string;
  territory?: string;
  band?: string;
  pronouns?: string;
  memberType?: "jobSeeker" | "professional" | "communityMember";
  openToWork?: boolean;
  jobTypes?: string[];
  preferredLocations?: string[];
  willingToRelocate?: boolean;
  experienceLevel?: "student" | "entry" | "mid" | "senior" | "executive";
  industry?: string;
  quickApplyEnabled?: boolean;
  defaultCoverLetter?: string;
  wizardDismissed?: boolean;
  email?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get a member profile by user ID (document ID).
 * Queries the "memberProfiles" collection.
 *
 * @param uid - The user's Firebase UID (used as document ID)
 * @returns The member profile or null if not found
 */
export async function getMemberProfile(
  uid: string
): Promise<MemberProfile | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb.collection(MEMBER_COLLECTION).doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as MemberProfile;
  } catch (error) {
    console.error("[getMemberProfile] Error:", error);
    return null;
  }
}

/**
 * Create a new member profile document.
 * Uses the UID as the document ID in the "memberProfiles" collection.
 *
 * @param uid - The user's Firebase UID
 * @param data - Profile fields (excluding id, userId, timestamps)
 */
export async function createMemberProfile(
  uid: string,
  data: Omit<MemberProfile, "id" | "userId" | "createdAt" | "updatedAt">
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
    .collection(MEMBER_COLLECTION)
    .doc(uid)
    .set({
      id: uid,
      userId: uid,
      ...cleanData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Update fields on an existing member profile.
 * Queries the "memberProfiles" collection by document ID.
 *
 * @param uid - The user's Firebase UID
 * @param data - Partial fields to update
 */
export async function updateMemberProfile(
  uid: string,
  data: Partial<Omit<MemberProfile, "id" | "userId" | "createdAt">>
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
    .collection(MEMBER_COLLECTION)
    .doc(uid)
    .update({
      ...cleanData,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Find a member profile by email field.
 * Queries the "memberProfiles" collection using a where clause on the email field.
 *
 * @param email - The email address to search for
 * @returns The matching member profile or null
 */
export async function getMemberByEmail(
  email: string
): Promise<MemberProfile | null> {
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection(MEMBER_COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return { ...(doc.data() as MemberProfile), id: doc.id };
  } catch (error) {
    console.error("[getMemberByEmail] Error:", error);
    return null;
  }
}
