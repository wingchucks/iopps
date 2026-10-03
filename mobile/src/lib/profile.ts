import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// The member profile is members/{uid}, the same record the website edits
// (src/lib/firestore/members.ts) and job applications read the saved resume from.
// firestore.rules lets members read their own users/{uid} and members/{uid} and write
// only listed profile fields, so this module writes those and nothing else.

export interface MemberProfile {
  uid: string;
  email: string;
  displayName: string;
  location: string;
  bio: string;
  photoURL: string;
  resumeUrl: string;
  resumeFileName: string;
}

export type MemberProfileUpdate = Partial<
  Pick<MemberProfile, "displayName" | "location" | "bio" | "photoURL" | "resumeUrl" | "resumeFileName">
>;

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** The member's profile; older accounts may only have a users/{uid} record. */
export async function getMemberProfile(uid: string): Promise<MemberProfile> {
  const [member, user] = await Promise.all([getDoc(doc(db, "members", uid)), getDoc(doc(db, "users", uid))]);
  const memberData: Record<string, unknown> = member.exists() ? member.data() : {};
  // Same precedence as the website's application snapshot: the member record wins.
  const data: Record<string, unknown> = { ...(user.exists() ? user.data() : {}), ...memberData };
  return {
    uid,
    email: text(data.email),
    displayName: text(data.displayName) || text(data.name),
    location: text(data.location),
    bio: text(data.bio),
    photoURL: text(data.photoURL),
    // Applications attach the resume saved on members/{uid}, never one on users/{uid}.
    resumeUrl: text(memberData.resumeUrl),
    resumeFileName: text(memberData.resumeFileName),
  };
}

/** Saves profile fields to members/{uid}, creating the record the first time. */
export async function saveMemberProfile(uid: string, email: string | null, updates: MemberProfileUpdate): Promise<void> {
  const fields: Record<string, unknown> = { ...updates, updatedAt: serverTimestamp() };
  for (const key of Object.keys(fields)) if (fields[key] === undefined) delete fields[key];
  if (updates.resumeUrl !== undefined) fields.resumeUploadedAt = updates.resumeUrl ? new Date().toISOString() : "";
  const ref = doc(db, "members", uid);
  if ((await getDoc(ref)).exists()) {
    await updateDoc(ref, fields);
  } else {
    await setDoc(ref, { uid, ...(email ? { email } : {}), ...fields, joinedAt: serverTimestamp() });
  }
}
