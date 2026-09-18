import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
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
  location?: string | { city?: string; venue?: string; province?: string; remote?: boolean };
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
  const response = await fetch("/api/events", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load events.");
  return (await response.json()).events || [];
}
export async function getEvent(id: string): Promise<Event | null> {
  const response = await fetch(`/api/events/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load listing.");
  return (await response.json()).event;
}
export const getEventBySlug = getEvent;

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
