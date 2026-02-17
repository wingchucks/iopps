import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface MemberProfile {
  uid: string;
  displayName: string;
  email: string;
  community: string;
  location: string;
  bio: string;
  interests: string[];
  joinedAt: unknown;
  updatedAt: unknown;
  photoURL?: string;
}

export async function getMemberProfile(
  uid: string
): Promise<MemberProfile | null> {
  const snap = await getDoc(doc(db, "members", uid));
  if (!snap.exists()) return null;
  return snap.data() as MemberProfile;
}

export async function createMemberProfile(
  uid: string,
  data: {
    displayName: string;
    email: string;
    community: string;
    location: string;
    bio: string;
    interests: string[];
  }
): Promise<void> {
  await setDoc(doc(db, "members", uid), {
    uid,
    ...data,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMemberProfile(
  uid: string,
  data: Partial<
    Pick<
      MemberProfile,
      "displayName" | "community" | "location" | "bio" | "interests" | "photoURL"
    >
  >
): Promise<void> {
  await updateDoc(doc(db, "members", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
