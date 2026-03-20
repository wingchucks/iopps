import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface SavedItem {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  postType: string;
  postOrgName?: string;
  savedAt: unknown;
}

const col = collection(db, "saved_items");

export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("savedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedItem);
}

export async function isPostSaved(
  userId: string,
  postId: string
): Promise<boolean> {
  const docId = `${userId}_${postId}`;
  const snap = await getDocs(
    query(col, where("userId", "==", userId), where("postId", "==", postId))
  );
  return !snap.empty;
}

export async function savePost(
  userId: string,
  postId: string,
  postTitle: string,
  postType: string,
  postOrgName?: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await setDoc(doc(db, "saved_items", docId), {
    userId,
    postId,
    postTitle,
    postType,
    ...(postOrgName ? { postOrgName } : {}),
    savedAt: serverTimestamp(),
  });
}

export async function unsavePost(
  userId: string,
  postId: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await deleteDoc(doc(db, "saved_items", docId));
}
