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

export interface Event {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  date?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: string;
  eventType?: string;
  category?: string;
  organizer?: string;
  orgId?: string;
  orgName?: string;
  orgShort?: string;
  authorId?: string;
  imageUrl?: string;
  price?: string;
  isFree?: boolean;
  rsvpLink?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  schedule?: { day: string; items: string[] }[];
  highlights?: string[];
  status?: string;
  active?: boolean;
  featured?: boolean;
  badges?: string[];
  source?: string;
  createdAt?: unknown;
  order?: number;
}

const col = collection(db, "events");

export async function getEvents(): Promise<Event[]> {
  const constraints: QueryConstraint[] = [orderBy("order", "asc")];
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Event);
}

export async function getEvent(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const snap = await getDocs(query(col, where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Event;
}

export async function getEventsByOrg(orgId: string): Promise<Event[]> {
  const snap = await getDocs(query(col, where("orgId", "==", orgId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Event);
}

export async function createEvent(
  data: Omit<Event, "id" | "createdAt" | "order">
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

export async function updateEvent(
  id: string,
  data: Partial<Omit<Event, "id">>
): Promise<void> {
  await updateDoc(doc(col, id), data);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(col, id));
}
