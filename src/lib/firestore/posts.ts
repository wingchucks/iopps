import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export type PostType =
  | "job"
  | "event"
  | "scholarship"
  | "program"
  | "story"
  | "spotlight";

export interface Post {
  id: string;
  type: PostType;
  title: string;
  orgId?: string;
  orgName?: string;
  orgShort?: string;
  location?: string;
  description?: string;
  // Job fields
  salary?: string;
  jobType?: string;
  deadline?: string;
  featured?: boolean;
  closingSoon?: boolean;
  source?: string;
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  // Event fields
  dates?: string;
  price?: string;
  eventType?: string;
  organizer?: string;
  schedule?: { day: string; items: string[] }[];
  highlights?: string[];
  // Program fields
  duration?: string;
  credential?: string;
  // Story fields
  quote?: string;
  community?: string;
  // Common
  badges?: string[];
  createdAt: unknown;
  order: number;
}

const col = collection(db, "posts");

export async function getPosts(opts?: {
  type?: PostType;
  max?: number;
}): Promise<Post[]> {
  const constraints: QueryConstraint[] = [orderBy("order", "asc")];
  if (opts?.type) constraints.unshift(where("type", "==", opts.type));
  if (opts?.max) constraints.push(limit(opts.max));
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

export async function getPostsByOrg(orgId: string): Promise<Post[]> {
  const snap = await getDocs(
    query(col, where("orgId", "==", orgId), orderBy("order", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

export async function getPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, "posts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Post;
}

export async function setPost(
  id: string,
  data: Omit<Post, "id">
): Promise<void> {
  await setDoc(doc(db, "posts", id), data);
}
