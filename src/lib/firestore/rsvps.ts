import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getEventBySlug } from "./events";
import { getEventDisplayDates, isEventCompleted } from "../public-events";

export type RSVPStatus = "going" | "interested" | "not_going";

export interface RSVP {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  postDate?: string;
  postLocation?: string;
  status: RSVPStatus;
  rsvpedAt: unknown;
}

const col = collection(db, "event_rsvps");

function getEventLookupCandidates(postId: string): string[] {
  const normalized = postId.trim();
  if (!normalized) return [];

  const values = new Set<string>([normalized]);
  if (normalized.startsWith("event-")) {
    values.add(normalized.slice(6));
  }

  return Array.from(values);
}

function formatEventLocation(
  location?: string | { city?: string; venue?: string; province?: string; remote?: boolean }
): string | undefined {
  if (!location) return undefined;
  if (typeof location === "string") return location;

  const parts = [location.venue, location.city, location.province]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  if (location.remote) return "Remote";
  return undefined;
}

export async function getRSVP(
  userId: string,
  postId: string
): Promise<RSVP | null> {
  const docId = `${userId}_${postId}`;
  const snap = await getDoc(doc(db, "event_rsvps", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RSVP;
}

export async function setRSVP(rsvp: {
  userId: string;
  postId: string;
  postTitle: string;
  postDate?: string;
  postLocation?: string;
  status: RSVPStatus;
}): Promise<void> {
  const docId = `${rsvp.userId}_${rsvp.postId}`;
  await setDoc(doc(db, "event_rsvps", docId), {
    ...rsvp,
    rsvpedAt: serverTimestamp(),
  });
}

export async function removeRSVP(
  userId: string,
  postId: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  await deleteDoc(doc(db, "event_rsvps", docId));
}

export async function getUserRSVPs(userId: string): Promise<RSVP[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("rsvpedAt", "desc"))
  );
  const rawRsvps = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RSVP);

  const resolved = await Promise.all(
    rawRsvps.map(async (rsvp) => {
      for (const candidate of getEventLookupCandidates(rsvp.postId)) {
        const event = await getEventBySlug(candidate);
        if (event) {
          return {
            ...rsvp,
            postId: event.slug ? `event-${event.slug}` : rsvp.postId,
            postTitle: event.title || rsvp.postTitle,
            postDate: getEventDisplayDates(event) || rsvp.postDate,
            postLocation: formatEventLocation(event.location) || rsvp.postLocation,
          } as RSVP;
        }
      }

      if (isEventCompleted({ dates: rsvp.postDate })) {
        return null;
      }

      return rsvp;
    })
  );

  return resolved.filter((rsvp): rsvp is RSVP => Boolean(rsvp));
}

export async function getEventRSVPCount(postId: string): Promise<number> {
  const snap = await getDocs(
    query(col, where("postId", "==", postId), where("status", "==", "going"))
  );
  return snap.size;
}
