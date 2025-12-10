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
