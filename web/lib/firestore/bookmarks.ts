import {
  collection, doc, getDocs, addDoc, deleteDoc, query, where, orderBy, Timestamp, increment, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Bookmark, ContentType } from "@/lib/types";

const col = () => collection(db!, "bookmarks");

export async function addBookmark(uid: string, postId: string, postType: ContentType): Promise<string> {
  const ref = await addDoc(col(), { uid, postId, postType, createdAt: Timestamp.now() });
  await updateDoc(doc(db!, "posts", postId), { saveCount: increment(1) });
  return ref.id;
}

export async function removeBookmark(uid: string, postId: string): Promise<void> {
  const snap = await getDocs(query(col(), where("uid", "==", uid), where("postId", "==", postId)));
  for (const d of snap.docs) await deleteDoc(d.ref);
  await updateDoc(doc(db!, "posts", postId), { saveCount: increment(-1) });
}

export async function getBookmarks(uid: string, type?: ContentType): Promise<Bookmark[]> {
  const constraints = [where("uid", "==", uid)];
  if (type) constraints.push(where("postType", "==", type));
  const snap = await getDocs(query(col(), ...constraints, orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bookmark));
}

export async function isBookmarked(uid: string, postId: string): Promise<boolean> {
  const snap = await getDocs(query(col(), where("uid", "==", uid), where("postId", "==", postId)));
  return !snap.empty;
}
