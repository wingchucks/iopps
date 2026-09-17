import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export type PostType =
  | "job"
  | "event"
  | "scholarship"
  | "program"
  | "story"
  | "spotlight";

export type PostStatus = "draft" | "active" | "closed";

export interface Post {
  id: string;
  type: PostType;
  title: string;
  slug?: string;
  status?: PostStatus;
  orgId?: string;
  employerId?: string;
  orgName?: string;
  orgShort?: string;
  location?: string;
  description?: string;
  // Job fields
  salary?: string;
  jobType?: string;
  deadline?: string;
  closingDate?: string;
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
  // Scholarship fields
  amount?: string;
  eligibility?: string;
  requirements?: string[];
  applicationUrl?: string;
  // Program fields
  duration?: string;
  credential?: string;
  programUrl?: string;
  // Story fields
  quote?: string;
  community?: string;
  author?: string;
  featuredImage?: string;
  excerpt?: string;
  // Common
  badges?: string[];
  createdAt: unknown;
  order: number;
}


function normalizePost(id: string, data: Record<string, unknown>): Post {
  const loc = data.location;
  if (loc && typeof loc === "object" && !Array.isArray(loc)) {
    const l = loc as Record<string, unknown>;
    const parts: string[] = [];
    if (l.city) parts.push(String(l.city));
    if (l.province) parts.push(String(l.province));
    if (l.remote) parts.push("Remote");
    data = { ...data, location: parts.join(", ") || undefined };
  }
  return { id, ...data } as Post;
}

export async function getPosts(opts?: { type?: PostType; max?: number }): Promise<Post[]> {
  const response = await fetch("/api/posts", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load posts");
  const data = await response.json();
  const posts = data.posts.map((post: Record<string, unknown>) => normalizePost(String(post.id), post)).filter((post: Post) => !opts?.type || post.type === opts.type);
  return opts?.max ? posts.slice(0, opts.max) : posts;
}

export async function getPostsByOrg(orgId: string): Promise<Post[]> {
  return (await getPosts()).filter(post => post.orgId === orgId);
}

export async function getPost(id: string): Promise<Post | null> {
  const response = await fetch("/api/posts?id=" + encodeURIComponent(id), { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load post");
  const data = await response.json();
  return data.posts[0] ? normalizePost(data.posts[0].id, data.posts[0]) : null;
}

export async function setPost(
  id: string,
  data: Omit<Post, "id">
): Promise<void> {
  await setDoc(doc(db, "posts", id), data);
}

export async function deletePost(id: string): Promise<void> {
  await deleteDoc(doc(db, "posts", id));
}

export async function getOrgPosts(orgId: string): Promise<Post[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to view organization content");
  const response = await fetch("/api/employer/jobs", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load organization content");
  const data = await response.json();
  return data.jobs.filter((job: Post) => [job.orgId, job.employerId].includes(orgId)).map((job: Post) => ({ ...job, type: "job" }));
}

export async function createPost(
  data: Omit<Post, "id" | "createdAt" | "order">
): Promise<string> {
  const id =
    data.slug ||
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  await setDoc(doc(db, "posts", id), {
    ...data,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
  return id;
}

export async function updatePost(
  id: string,
  data: Partial<Omit<Post, "id">>
): Promise<void> {
  const existing = await getDoc(doc(db, "posts", id));
  if (!existing.exists()) throw new Error("Post not found");
  await updateDoc(doc(db, "posts", id), data);
}

/** Create a post authored by a community member (story type). */
export async function createMemberPost(data: {
  title: string;
  description: string;
  type: "story" | "spotlight";
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  featuredImage?: string;
}): Promise<string> {
  const slug =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36);
  const id = `${data.type}-${slug}`;
  // Strip undefined values — Firestore rejects them
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await setDoc(doc(db, "posts", id), {
    ...clean,
    status: "active",
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
  return id;
}
