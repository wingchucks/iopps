import {
  collection, doc, getDoc, getDocs, updateDoc, query, where, orderBy, limit,
  startAfter, Timestamp, type DocumentSnapshot, type QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

const col = () => collection(db!, "users");

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db!, "users", uid));
  return snap.exists() ? ({ ...snap.data(), uid: snap.id } as UserProfile) : null;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db!, "users", uid), { ...data, updatedAt: Timestamp.now() });
}

export async function setProfileComplete(uid: string): Promise<void> {
  await updateDoc(doc(db!, "users", uid), { profileComplete: true, updatedAt: Timestamp.now() });
}

export interface UserQueryFilters {
  skills?: string[];
  province?: string;
  nation?: string;
  interests?: string[];
  limitCount?: number;
  lastDoc?: DocumentSnapshot;
}

export async function getUsersByQuery(filters: UserQueryFilters): Promise<{ users: UserProfile[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [where("disabled", "==", false), where("profileComplete", "==", true)];

  if (filters.province) constraints.push(where("province", "==", filters.province));
  if (filters.nation) constraints.push(where("nation", "==", filters.nation));
  if (filters.skills?.length) constraints.push(where("skills", "array-contains-any", filters.skills));

  constraints.push(orderBy("createdAt", "desc"));
  if (filters.lastDoc) constraints.push(startAfter(filters.lastDoc));
  constraints.push(limit(filters.limitCount ?? 20));

  const snap = await getDocs(query(col(), ...constraints));
  const users = snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
  return { users, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
}
