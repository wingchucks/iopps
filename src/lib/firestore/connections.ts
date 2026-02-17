import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Connection {
  id: string;
  followerId: string;
  followingId: string;
  followerName?: string;
  followingName?: string;
  createdAt: unknown;
}

const col = collection(db, "connections");

export async function followUser(
  followerId: string,
  followingId: string,
  followerName?: string,
  followingName?: string
): Promise<void> {
  const id = `${followerId}_${followingId}`;
  await setDoc(doc(db, "connections", id), {
    followerId,
    followingId,
    followerName: followerName || "",
    followingName: followingName || "",
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const id = `${followerId}_${followingId}`;
  await deleteDoc(doc(db, "connections", id));
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const id = `${followerId}_${followingId}`;
  const snap = await getDoc(doc(db, "connections", id));
  return snap.exists();
}

export async function getFollowers(userId: string): Promise<Connection[]> {
  const q = query(col, where("followingId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Connection);
}

export async function getFollowing(userId: string): Promise<Connection[]> {
  const q = query(col, where("followerId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Connection);
}

export async function getFollowerCount(userId: string): Promise<number> {
  const q = query(col, where("followingId", "==", userId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const q = query(col, where("followerId", "==", userId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
