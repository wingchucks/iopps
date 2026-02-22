import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Scholarship {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  eligibility?: string;
  amount?: string;
  deadline?: string;
  organization?: string;
  orgId?: string;
  orgName?: string;
  orgShort?: string;
  url?: string;
  applicationUrl?: string;
  requirements?: string[];
  location?: string;
  status?: string;
  active?: boolean;
  featured?: boolean;
  badges?: string[];
  source?: string;
  createdAt?: unknown;
  order?: number;
}

const col = collection(db, "scholarships");

export async function getScholarships(): Promise<Scholarship[]> {
  const constraints: QueryConstraint[] = [orderBy("order", "asc")];
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  const snap = await getDoc(doc(col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Scholarship;
}

export async function getScholarshipBySlug(
  slug: string
): Promise<Scholarship | null> {
  const snap = await getDocs(query(col, where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Scholarship;
}

export async function createScholarship(
  data: Omit<Scholarship, "id" | "createdAt" | "order">
): Promise<string> {
  const id =
    data.slug ||
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  await setDoc(doc(col, id), {
    ...data,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
  return id;
}

export async function updateScholarship(
  id: string,
  data: Partial<Omit<Scholarship, "id">>
): Promise<void> {
  await updateDoc(doc(col, id), data);
}

export async function deleteScholarship(id: string): Promise<void> {
  await deleteDoc(doc(col, id));
}
