import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export type WorkPreference = "remote" | "in-person" | "hybrid" | "any";

export interface Education {
  school: string;
  degree: string;
  field: string;
  year: number;
}

export interface SalaryRange {
  min: number;
  max: number;
}

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
  orgId?: string;
  orgRole?: "owner" | "admin" | "member";
  role?: "admin" | "moderator";
  openToWork?: boolean;
  targetRoles?: string[];
  salaryRange?: SalaryRange | null;
  workPreference?: WorkPreference;
  skills?: string[];
  education?: Education[];
  nation?: string;
  territory?: string;
  languages?: string;
  headline?: string;
  skillsText?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
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
      | "displayName"
      | "community"
      | "location"
      | "bio"
      | "interests"
      | "photoURL"
      | "nation"
      | "territory"
      | "languages"
      | "headline"
      | "skillsText"
    >
  >
): Promise<void> {
  // When skillsText is updated, also parse it into a skills array
  const updates: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.skillsText !== undefined) {
    updates.skills = data.skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  await updateDoc(doc(db, "members", uid), updates);
}

export async function getAllMembers(): Promise<MemberProfile[]> {
  const snap = await getDocs(
    query(collection(db, "members"), orderBy("displayName"))
  );
  return snap.docs.map((d) => d.data() as MemberProfile);
}

const PAGE_SIZE = 30;

export async function getMembersPaginated(
  cursor?: QueryDocumentSnapshot
): Promise<{ members: MemberProfile[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy("displayName"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snap = await getDocs(query(collection(db, "members"), ...constraints));
  const members = snap.docs.map((d) => d.data() as MemberProfile);
  const lastDoc = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;
  return { members, lastDoc };
}

export async function updateCareerPreferences(
  uid: string,
  data: {
    openToWork?: boolean;
    targetRoles?: string[];
    salaryRange?: SalaryRange | null;
    workPreference?: WorkPreference;
    skills?: string[];
    education?: Education[];
  }
): Promise<void> {
  await updateDoc(doc(db, "members", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemberProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "members", uid));
}
