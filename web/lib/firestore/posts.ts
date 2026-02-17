import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy,
  limit, startAfter, increment, Timestamp, type DocumentSnapshot, type QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post, ContentType, PostStatus } from "@/lib/types";

const col = () => collection(db!, "posts");

export interface PostFilters {
  type?: ContentType;
  status?: PostStatus;
  orgId?: string;
  province?: string;
  city?: string;
  featured?: boolean;
  limitCount?: number;
  lastDoc?: DocumentSnapshot;
  orderField?: string;
  orderDir?: "asc" | "desc";
}

export async function getPosts(filters: PostFilters = {}): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];

  if (filters.type) constraints.push(where("type", "==", filters.type));
  if (filters.status) constraints.push(where("status", "==", filters.status));
  else constraints.push(where("status", "==", "active"));
  if (filters.orgId) constraints.push(where("orgId", "==", filters.orgId));
  if (filters.province) constraints.push(where("location.province", "==", filters.province));
  if (filters.city) constraints.push(where("location.city", "==", filters.city));
  if (filters.featured !== undefined) constraints.push(where("featured", "==", filters.featured));

  constraints.push(orderBy(filters.orderField ?? "createdAt", filters.orderDir ?? "desc"));
  if (filters.lastDoc) constraints.push(startAfter(filters.lastDoc));
  constraints.push(limit(filters.limitCount ?? 20));

  const snap = await getDocs(query(col(), ...constraints));
  const posts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Post));
  return { posts, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
}

export async function getPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db!, "posts", id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Post) : null;
}

export async function createPost(data: Omit<Post, "id" | "createdAt" | "updatedAt" | "viewCount" | "saveCount">): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(col(), { ...data, viewCount: 0, saveCount: 0, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updatePost(id: string, data: Partial<Post>): Promise<void> {
  await updateDoc(doc(db!, "posts", id), { ...data, updatedAt: Timestamp.now() });
}

export async function softDeletePost(id: string): Promise<void> {
  await updateDoc(doc(db!, "posts", id), { status: "hidden", updatedAt: Timestamp.now() });
}

export async function restorePost(id: string): Promise<void> {
  await updateDoc(doc(db!, "posts", id), { status: "active", updatedAt: Timestamp.now() });
}

export async function getFeaturedPosts(): Promise<Post[]> {
  const snap = await getDocs(query(col(), where("featured", "==", true), where("status", "==", "active"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Post));
}

export async function getPostsByOrg(orgId: string): Promise<Post[]> {
  const snap = await getDocs(query(col(), where("orgId", "==", orgId), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Post));
}

export async function incrementViewCount(id: string): Promise<void> {
  await updateDoc(doc(db!, "posts", id), { viewCount: increment(1) });
}
