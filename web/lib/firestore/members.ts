// Member-related Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  db,
  memberCollection,
  checkFirebase,
} from "./shared";
import type { MemberProfile } from "@/lib/types";
import { MOCK_MEMBERS } from "../mockData";

export async function getMemberProfile(
  userId: string
): Promise<MemberProfile | null> {
  const ref = doc(db!, memberCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as MemberProfile;
}

export async function upsertMemberProfile(
  userId: string,
  data: Omit<MemberProfile, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const ref = doc(db!, memberCollection, userId);
  const base = {
    displayName: data.displayName ?? "",
    location: data.location ?? "",
    skills: data.skills ?? [],
    experience: data.experience ?? "",
    education: data.education ?? "",
    resumeUrl: data.resumeUrl ?? "",
    coverLetterTemplate: data.coverLetterTemplate ?? "",
    indigenousAffiliation: data.indigenousAffiliation ?? "",
    availableForInterviews: data.availableForInterviews ?? "",
    messagingHandle: data.messagingHandle ?? "",
  };

  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...base,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function searchMembers(
  filters: {
    skills?: string[];
    availableOnly?: boolean;
    limit?: number;
  } = {}
): Promise<MemberProfile[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return MOCK_MEMBERS;

    const ref = collection(firestore, memberCollection);
    const constraints = [];

    if (filters.availableOnly) {
      constraints.push(where("availableForInterviews", "==", true));
    }

    if (filters.skills && filters.skills.length > 0) {
      constraints.push(where("skills", "array-contains-any", filters.skills.slice(0, 10)));
    }

    constraints.push(limit(filters.limit || 20));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as MemberProfile));

  } catch (error) {
    console.error("Error searching members:", error);
    return [];
  }
}

export interface ListMembersOptions {
  searchQuery?: string;
  location?: string;
  skills?: string[];
  availableOnly?: boolean;
  limit?: number;
  startAfterDoc?: unknown;
}

/**
 * List members for the community directory
 * Only returns members who have public profiles
 */
export async function listMembersForDirectory(
  options: ListMembersOptions = {}
): Promise<{ members: MemberProfile[]; hasMore: boolean }> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return { members: MOCK_MEMBERS.slice(0, options.limit || 20), hasMore: false };
    }

    const ref = collection(firestore, memberCollection);
    const constraints = [];

    // Filter by availability if requested
    if (options.availableOnly) {
      constraints.push(where("availableForInterviews", "in", ["yes", "maybe"]));
    }

    // Filter by skills if provided
    if (options.skills && options.skills.length > 0) {
      constraints.push(where("skills", "array-contains-any", options.skills.slice(0, 10)));
    }

    // Add limit (+1 to check if there are more)
    const queryLimit = (options.limit || 20) + 1;
    constraints.push(limit(queryLimit));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    let members = snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as MemberProfile));

    // Check if there are more results
    const hasMore = members.length > (options.limit || 20);
    if (hasMore) {
      members = members.slice(0, options.limit || 20);
    }

    // Client-side filtering for search query and location
    // (Firestore doesn't support full-text search)
    if (options.searchQuery) {
      const searchLower = options.searchQuery.toLowerCase();
      members = members.filter(m =>
        m.displayName?.toLowerCase().includes(searchLower) ||
        m.bio?.toLowerCase().includes(searchLower) ||
        m.indigenousAffiliation?.toLowerCase().includes(searchLower) ||
        m.skills?.some(s => s.toLowerCase().includes(searchLower))
      );
    }

    if (options.location) {
      const locationLower = options.location.toLowerCase();
      members = members.filter(m =>
        m.location?.toLowerCase().includes(locationLower)
      );
    }

    // Filter out members without display names (incomplete profiles)
    members = members.filter(m => m.displayName && m.displayName.trim().length > 0);

    return { members, hasMore };
  } catch (error) {
    console.error("Error listing members for directory:", error);
    return { members: [], hasMore: false };
  }
}
