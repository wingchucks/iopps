import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Conference {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  date?: string;
  dates?: string;
  location?: string;
  organizer?: string;
  orgId?: string;
  orgName?: string;
  orgShort?: string;
  imageUrl?: string;
  price?: string;
  schedule?: { day: string; items: string[] }[];
  highlights?: string[];
  speakers?: { name: string; title?: string; bio?: string }[];
  status?: string;
  active?: boolean;
  featured?: boolean;
  badges?: string[];
  source?: string;
  createdAt?: unknown;
  order?: number;
}

const col = collection(db, "conferences");

export async function getConferences(): Promise<Conference[]> {
  const constraints: QueryConstraint[] = [orderBy("order", "asc")];
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Conference);
}

export async function getConference(id: string): Promise<Conference | null> {
  const snap = await getDoc(doc(col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Conference;
}

export async function getConferenceBySlug(
  slug: string
): Promise<Conference | null> {
  const snap = await getDocs(query(col, where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Conference;
}
