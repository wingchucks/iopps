import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

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
  if (auth.currentUser?.uid !== uid) {
    const result = await memberRequest("?uid=" + encodeURIComponent(uid));
    return result.member as MemberProfile | null;
  }
  const snap = await getDoc(doc(db, "members", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as MemberProfile;
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
    nation?: string;
    territory?: string;
    languages?: string;
    headline?: string;
    skillsText?: string;
    skills?: string[];
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

async function memberRequest(query = "") {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to view members");
  const response = await fetch("/api/members" + query, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load members");
  return response.json();
}

export async function getAllMembers(): Promise<MemberProfile[]> {
  const members: MemberProfile[] = [];
  let cursor: string | null = null;
  do {
    const page = await getMembersPaginated(cursor);
    members.push(...page.members);
    cursor = page.lastDoc;
  } while (cursor);
  return members;
}

export async function getMembersPaginated(cursor?: string | null): Promise<{ members: MemberProfile[]; lastDoc: string | null }> {
  const data = await memberRequest(cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
  return { members: data.members, lastDoc: data.nextCursor };
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

export async function deleteOwnAccount(uid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Sign in to delete your account");
  const response = await fetch("/api/account", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmDelete: true }),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Unable to delete account");
  }
}
