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
  limit,
  startAfter,
  serverTimestamp,
  getCountFromServer,
  type QueryDocumentSnapshot,
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

const PAGE_SIZE = 30;

export async function getFollowersPaginated(
  userId: string,
  cursor?: QueryDocumentSnapshot
): Promise<{ items: Connection[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    where("followingId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snap = await getDocs(query(col, ...constraints));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Connection);
  const lastDoc = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
}

export async function getFollowingPaginated(
  userId: string,
  cursor?: QueryDocumentSnapshot
): Promise<{ items: Connection[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    where("followerId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snap = await getDocs(query(col, ...constraints));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Connection);
  const lastDoc = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
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
