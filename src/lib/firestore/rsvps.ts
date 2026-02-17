import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export type RSVPStatus = "going" | "interested" | "not_going";

export interface RSVP {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  postDate?: string;
  postLocation?: string;
  status: RSVPStatus;
  rsvpedAt: unknown;
}

const col = collection(db, "event_rsvps");

export async function getRSVP(
  userId: string,
  postId: string
): Promise<RSVP | null> {
  const docId = `${userId}_${postId}`;
  const snap = await getDoc(doc(db, "event_rsvps", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RSVP;
}

export async function setRSVP(rsvp: {
  userId: string;
  postId: string;
  postTitle: string;
  postDate?: string;
  postLocation?: string;
  status: RSVPStatus;
}): Promise<void> {
  const docId = `${rsvp.userId}_${rsvp.postId}`;
  await setDoc(doc(db, "event_rsvps", docId), {
    ...rsvp,
    rsvpedAt: serverTimestamp(),
  });
}

export async function removeRSVP(
  userId: string,
  postId: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await deleteDoc(doc(db, "event_rsvps", docId));
}

export async function getUserRSVPs(userId: string): Promise<RSVP[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("rsvpedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RSVP);
}

export async function getEventRSVPCount(postId: string): Promise<number> {
  const snap = await getDocs(
    query(col, where("postId", "==", postId), where("status", "==", "going"))
  );
  return snap.size;
}
