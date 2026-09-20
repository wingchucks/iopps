import {
  collection,
  getDocs,
  getDocsFromServer,
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
  // Own-user queries are permitted even when no document exists; direct reads
  // of missing documents are not. Rules deny updates to existing saved items.
  const savedQuery = query(col, where("userId", "==", userId), where("postId", "==", postId));
  if (!(await getDocsFromServer(savedQuery)).empty) return;
  try {
    await setDoc(doc(db, "saved_items", docId), {
      userId,
      postId,
      postTitle,
      postType,
      ...(postOrgName ? { postOrgName } : {}),
      savedAt: serverTimestamp(),
    });
  } catch (error) {
    // Another tab may have created the same save. Only server-confirmed own
    // data can acknowledge success; offline/cache state cannot consume intent.
    if (!(await getDocsFromServer(savedQuery)).empty) return;
    throw error;
  }
}

export async function unsavePost(
  userId: string,
  postId: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await deleteDoc(doc(db, "saved_items", docId));
}
