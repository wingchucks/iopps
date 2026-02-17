import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Application {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  orgName: string;
  status: "applied" | "under_review" | "viewed" | "interview" | "accepted" | "rejected";
  appliedAt: unknown;
}

const col = collection(db, "applications");

export async function getApplications(userId: string): Promise<Application[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("appliedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
}

export async function hasApplied(
  userId: string,
  postId: string
): Promise<boolean> {
  const docId = `${userId}_${postId}`;
  const snap = await getDoc(doc(db, "applications", docId));
  return snap.exists();
}

export async function applyToPost(
  userId: string,
  postId: string,
  postTitle: string,
  orgName: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await setDoc(doc(db, "applications", docId), {
    userId,
    postId,
    postTitle,
    orgName,
    status: "applied",
    appliedAt: serverTimestamp(),
  });
}
