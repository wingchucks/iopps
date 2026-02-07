// Conference-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  db,
  conferencesCollection,
  savedConferencesCollection,
  conferenceRegistrationsCollection,
  conferenceFingerprintHistoryCollection,
  checkFirebase,
} from "./shared";
import type { Conference, ConferenceRegistration, ConferenceVisibilityTier } from "@/lib/types";
import { MOCK_CONFERENCES } from "../mockData";
import { toDate } from "./timestamps";

// Constants for visibility system
export const FREE_VISIBILITY_DAYS = 45;
export const FAR_FUTURE_EVENT_DAYS = 90; // Show warning for events more than 90 days out

// Check if a conference has ended based on endDate
export function isConferenceExpired(conference: Conference): boolean {
  const now = new Date();
  const endDate = toDate(conference.endDate);
  if (endDate && endDate < now) return true;
  return false;
}

// =====================================================
// VISIBILITY SYSTEM - 45-day free visibility guardrail
// =====================================================

/**
 * Generate a deterministic fingerprint for duplicate detection.
 * Fingerprint = normalized hash of: orgId + title + startDate + city
 */
export function generateConferenceFingerprint(
  employerId: string,
  title: string,
  startDate: any, // Accept any timestamp format
  location: string
): string {
  // Normalize inputs
  const normalizedTitle = (title || "").toLowerCase().trim().replace(/\s+/g, " ");
  const normalizedLocation = (location || "").toLowerCase().trim().replace(/\s+/g, " ");

  // Extract city from location (first part before comma typically)
  const city = normalizedLocation.split(",")[0].trim();

  // Format date as YYYY-MM-DD
  let dateStr = "";
  if (startDate) {
    const d = toDate(startDate);
    if (d && !isNaN(d.getTime())) {
      dateStr = d.toISOString().split("T")[0];
    }
  }

  // Create fingerprint string and hash it
  const fingerprintInput = `${employerId}|${normalizedTitle}|${dateStr}|${city}`;

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < fingerprintInput.length; i++) {
    hash = (hash * 33) ^ fingerprintInput.charCodeAt(i);
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

/**
 * Compute current visibility tier based on conference data
 */
export function computeVisibilityTier(conference: Conference): ConferenceVisibilityTier {
  const now = new Date();

  // Check if actively featured (featured flag true AND not expired)
  if (conference.featured) {
    const featuredExpires = toDate(conference.featuredExpiresAt);
    if (!featuredExpires || featuredExpires > now) {
      return "featured";
    }
  }

  // Check if within free visibility window
  const freeExpires = toDate(conference.freeVisibilityExpiresAt);
  if (freeExpires && freeExpires > now) {
    return "standard";
  }

  // If published but free visibility expired, it's demoted
  const publishedAt = toDate(conference.publishedAt);
  if (publishedAt) {
    return "demoted";
  }

  // Default to standard for unpublished/new conferences
  return "standard";
}

/**
 * Check if a conference is visible in standard/featured listings
 * (demoted conferences are NOT included in main listings)
 */
export function isConferenceVisible(conference: Conference): boolean {
  if (!conference.active) return false;
  if (isConferenceExpired(conference)) return false;

  const tier = computeVisibilityTier(conference);
  return tier === "featured" || tier === "standard";
}

/**
 * Check if the event start date is far in the future (>90 days)
 */
export function isEventFarInFuture(startDate: Date | string | null): boolean {
  if (!startDate) return false;
  const d = typeof startDate === "string" ? new Date(startDate) : startDate;
  if (!(d instanceof Date) || isNaN(d.getTime())) return false;

  const now = new Date();
  const daysUntil = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil > FAR_FUTURE_EVENT_DAYS;
}

// Fingerprint history entry type
export interface FingerprintHistoryEntry {
  employerId: string;
  fingerprint: string;
  firstPublishedAt: Date;
  freeVisibilityExpiresAt: Date;
  freeVisibilityUsed: boolean;
  conferenceId: string;
  title: string;
}

/**
 * Record fingerprint when a conference is first published
 */
export async function recordFingerprintHistory(
  employerId: string,
  fingerprint: string,
  conferenceId: string,
  title: string
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  const docId = `${employerId}_${fingerprint}`;
  const ref = doc(firestore, conferenceFingerprintHistoryCollection, docId);

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + FREE_VISIBILITY_DAYS);

  await setDoc(ref, {
    employerId,
    fingerprint,
    firstPublishedAt: now,
    freeVisibilityExpiresAt: expiresAt,
    freeVisibilityUsed: true,
    conferenceId,
    title,
  });
}

/**
 * Check if a fingerprint has already used free visibility
 * Returns the history entry if found and expired, null otherwise
 */
export async function checkFingerprintHistory(
  employerId: string,
  fingerprint: string
): Promise<FingerprintHistoryEntry | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  const docId = `${employerId}_${fingerprint}`;
  const ref = doc(firestore, conferenceFingerprintHistoryCollection, docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data() as FingerprintHistoryEntry;
  const now = new Date();
  const expiresAt = toDate(data.freeVisibilityExpiresAt);

  // Only return if free visibility has expired (blocking scenario)
  if (expiresAt && expiresAt <= now && data.freeVisibilityUsed) {
    return data;
  }

  return null;
}

/**
 * Check if publishing this conference would be blocked (duplicate repost)
 * Returns { blocked: true, reason: string } if blocked, { blocked: false } otherwise
 */
export async function checkPublishBlocked(
  conference: Conference,
  willBeFeatured: boolean = false
): Promise<{ blocked: boolean; reason?: string; existingEntry?: FingerprintHistoryEntry }> {
  // Featured listings bypass the duplicate check
  if (willBeFeatured) {
    return { blocked: false };
  }

  // Generate fingerprint for this conference
  const fingerprint = generateConferenceFingerprint(
    conference.employerId,
    conference.title,
    conference.startDate,
    conference.location
  );

  // Check fingerprint history
  const existingEntry = await checkFingerprintHistory(conference.employerId, fingerprint);

  if (existingEntry) {
    return {
      blocked: true,
      reason: "This conference has already received its free 45-day visibility period.",
      existingEntry,
    };
  }

  return { blocked: false };
}

type ConferenceInput = Omit<
  Conference,
  "id" | "createdAt" | "active" | "employerId"
> & { employerId: string; active?: boolean };

export async function createConference(input: ConferenceInput): Promise<string> {
  const ref = collection(db!, conferencesCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, conferencesCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export interface ListConferencesOptions {
  includeExpired?: boolean;
  includeDemoted?: boolean; // Include demoted conferences (for admin/search)
}

/**
 * List conferences with visibility-aware filtering and sorting.
 * By default, only shows featured + standard visibility (excludes demoted).
 * Sorting: Featured first (by featuredExpiresAt), then standard (by startDate)
 */
export async function listConferences(options: ListConferencesOptions = {}): Promise<Conference[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      let conferences = [...MOCK_CONFERENCES];
      if (!options.includeExpired) {
        conferences = conferences.filter(c => c.active !== false && !isConferenceExpired(c));
      }
      return conferences;
    }
    const ref = collection(firestore, conferencesCollection);
    const q = query(ref, where("active", "==", true), orderBy("startDate", "asc"));
    const snap = await getDocs(q);
    let conferences = snap.docs.map((docSnap) => docSnap.data() as Conference);

    // Client-side filtering for expired conferences (safety net)
    if (!options.includeExpired) {
      conferences = conferences.filter(c => !isConferenceExpired(c));
    }

    // Apply visibility filtering (exclude demoted unless explicitly requested)
    if (!options.includeDemoted) {
      conferences = conferences.filter(c => isConferenceVisible(c));
    }

    // Sort: Featured first (newest featured first), then standard (by start date)
    conferences.sort((a, b) => {
      const aTier = computeVisibilityTier(a);
      const bTier = computeVisibilityTier(b);

      // Featured conferences come first
      if (aTier === "featured" && bTier !== "featured") return -1;
      if (bTier === "featured" && aTier !== "featured") return 1;

      // Among featured, sort by featuredExpiresAt (soonest ending first) or createdAt
      if (aTier === "featured" && bTier === "featured") {
        const aExpires = toDate(a.featuredExpiresAt)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bExpires = toDate(b.featuredExpiresAt)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aExpires - bExpires;
      }

      // Standard conferences: by start date (soonest first)
      const aStart = toDate(a.startDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bStart = toDate(b.startDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    });

    return conferences;
  } catch {
    return [];
  }
}

export async function listEmployerConferences(
  employerId: string
): Promise<Conference[]> {
  const ref = collection(db!, conferencesCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.data() as Conference);
}

export async function getConference(id: string): Promise<Conference | null> {
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_CONFERENCES.find(c => c.id === id) || null;
  }
  const ref = doc(firestore, conferencesCollection, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Conference;
}

export async function updateConference(
  id: string,
  data: Partial<Conference>
) {
  const ref = doc(db!, conferencesCollection, id);
  await updateDoc(ref, data);
}

export async function deleteConference(id: string) {
  // Note: Fingerprint history is preserved in separate collection
  // to prevent delete-and-repost abuse
  const ref = doc(db!, conferencesCollection, id);
  await deleteDoc(ref);
}

/**
 * Publish a conference - sets publishedAt, freeVisibilityExpiresAt, fingerprint
 * Returns { success: true } or { success: false, reason: string }
 */
export async function publishConference(
  conferenceId: string,
  willBeFeatured: boolean = false
): Promise<{ success: boolean; reason?: string }> {
  const firestore = checkFirebase();
  if (!firestore) {
    return { success: false, reason: "Database not available" };
  }

  // Get the conference
  const conference = await getConference(conferenceId);
  if (!conference) {
    return { success: false, reason: "Conference not found" };
  }

  // Check if already published
  if (conference.publishedAt) {
    // Already published - just reactivate
    await updateConference(conferenceId, { active: true });
    return { success: true };
  }

  // Generate fingerprint
  const fingerprint = generateConferenceFingerprint(
    conference.employerId,
    conference.title,
    conference.startDate,
    conference.location
  );

  // Check for duplicate (blocked repost)
  const blockCheck = await checkPublishBlocked(conference, willBeFeatured);
  if (blockCheck.blocked) {
    return { success: false, reason: blockCheck.reason };
  }

  // Set visibility fields
  const now = new Date();
  const freeVisibilityExpiresAt = new Date(now);
  freeVisibilityExpiresAt.setDate(freeVisibilityExpiresAt.getDate() + FREE_VISIBILITY_DAYS);

  // Update conference with visibility fields
  await updateConference(conferenceId, {
    active: true,
    publishedAt: now,
    freeVisibilityExpiresAt,
    eventFingerprint: fingerprint,
    freeVisibilityUsed: true,
    visibilityTier: willBeFeatured ? "featured" : "standard",
  });

  // Record fingerprint history (for anti-repost after delete)
  await recordFingerprintHistory(
    conference.employerId,
    fingerprint,
    conferenceId,
    conference.title
  );

  return { success: true };
}

// Saved Conferences
export type SavedConference = {
  id?: string;
  memberId: string;
  conferenceId: string;
  createdAt?: any;
  conference?: Conference | null;
};

export async function toggleSavedConference(
  memberId: string,
  conferenceId: string,
  shouldSave: boolean
) {
  const snapshot = await getDocs(
    query(
      collection(db!, savedConferencesCollection),
      where("memberId", "==", memberId),
      where("conferenceId", "==", conferenceId)
    )
  );

  if (shouldSave) {
    if (snapshot.empty) {
      await addDoc(collection(db!, savedConferencesCollection), {
        memberId,
        conferenceId,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
}

export async function listSavedConferences(
  memberId: string
): Promise<SavedConference[]> {
  const ref = collection(db!, savedConferencesCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  const results: SavedConference[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as SavedConference;
    const conference = await getConference(data.conferenceId);
    results.push({
      ...data,
      id: docSnap.id,
      conference,
    });
  }
  return results;
}

export async function listSavedConferenceIds(memberId: string): Promise<string[]> {
  const ref = collection(db!, savedConferencesCollection);
  const q = query(ref, where("memberId", "==", memberId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as SavedConference;
    return data.conferenceId;
  });
}

// Conference Registration
type ConferenceRegistrationInput = Omit<
  ConferenceRegistration,
  "id" | "createdAt"
>;

export async function createConferenceRegistration(
  input: ConferenceRegistrationInput
): Promise<string> {
  const ref = collection(db!, conferenceRegistrationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, conferenceRegistrationsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}
