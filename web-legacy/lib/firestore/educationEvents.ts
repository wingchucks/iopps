// Education Event Firestore operations for the Education Pillar
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
  db,
  educationEventsCollection,
  checkFirebase,
  Timestamp,
} from "./shared";
import type { QueryConstraint } from "./shared";
import type {
  EducationEvent,
  EducationEventType,
  EducationEventFormat,
} from "@/lib/types";

// ============================================
// EVENT CRUD OPERATIONS
// ============================================

type EventInput = Omit<EducationEvent, "id" | "createdAt" | "updatedAt" | "isPublished" | "attendeeCount" | "rsvpMemberIds" | "name" | "type" | "startDatetime"> & {
  name?: string;
  type?: EducationEventType;
  startDatetime?: Timestamp | Date | string | null;
  isPublished?: boolean;
};

export async function createEducationEvent(input: EventInput): Promise<string> {
  const ref = collection(db!, educationEventsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    isPublished: input.isPublished ?? false,
    attendeeCount: 0,
    rsvpMemberIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Update the document with its own ID
  await updateDoc(doc(db!, educationEventsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function getEducationEvent(id: string): Promise<EducationEvent | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = doc(firestore, educationEventsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as EducationEvent;
  } catch {
    return null;
  }
}

export async function updateEducationEvent(id: string, data: Partial<EducationEvent>): Promise<void> {
  const ref = doc(db!, educationEventsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEducationEvent(id: string): Promise<void> {
  const ref = doc(db!, educationEventsCollection, id);
  await deleteDoc(ref);
}

// ============================================
// EVENT LISTING OPERATIONS
// ============================================

export interface ListEducationEventsOptions {
  schoolId?: string;
  type?: EducationEventType;
  format?: EducationEventFormat;
  upcoming?: boolean;
  publishedOnly?: boolean;
  limitCount?: number;
  afterDate?: Date;
  beforeDate?: Date;
}

export async function listEducationEvents(options: ListEducationEventsOptions = {}): Promise<EducationEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, educationEventsCollection);
    const constraints: QueryConstraint[] = [];

    if (options.publishedOnly !== false) {
      constraints.push(where("isPublished", "==", true));
    }

    if (options.schoolId) {
      constraints.push(where("schoolId", "==", options.schoolId));
    }

    if (options.type) {
      constraints.push(where("type", "==", options.type));
    }

    if (options.format) {
      constraints.push(where("format", "==", options.format));
    }

    // Filter for upcoming events only
    if (options.upcoming) {
      const now = Timestamp.now();
      constraints.push(where("startDatetime", ">=", now));
    }

    if (options.afterDate) {
      constraints.push(where("startDatetime", ">=", Timestamp.fromDate(options.afterDate)));
    }

    if (options.beforeDate) {
      constraints.push(where("startDatetime", "<=", Timestamp.fromDate(options.beforeDate)));
    }

    constraints.push(orderBy("startDatetime", "asc"));

    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as EducationEvent);
  } catch {
    return [];
  }
}

export async function listSchoolEvents(schoolId: string): Promise<EducationEvent[]> {
  return listEducationEvents({ schoolId, publishedOnly: true, upcoming: true });
}

export async function listSchoolEventsForDashboard(schoolId: string): Promise<EducationEvent[]> {
  return listEducationEvents({ schoolId, publishedOnly: false });
}

export async function listUpcomingEvents(limitCount: number = 6): Promise<EducationEvent[]> {
  return listEducationEvents({ upcoming: true, publishedOnly: true, limitCount });
}

export async function listThisWeekEvents(): Promise<EducationEvent[]> {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);

  return listEducationEvents({
    publishedOnly: true,
    afterDate: now,
    beforeDate: endOfWeek,
  });
}

export async function listEventsByMonth(year: number, month: number): Promise<EducationEvent[]> {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  return listEducationEvents({
    publishedOnly: true,
    afterDate: startOfMonth,
    beforeDate: endOfMonth,
  });
}

// ============================================
// EVENT RSVP OPERATIONS
// ============================================

export async function rsvpToEvent(eventId: string, memberId: string): Promise<void> {
  try {
    const ref = doc(db!, educationEventsCollection, eventId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const event = snap.data() as EducationEvent;
    const rsvpMemberIds = event.rsvpMemberIds || [];

    // Check if already RSVP'd
    if (rsvpMemberIds.includes(memberId)) return;

    // Check capacity
    if (event.capacity && rsvpMemberIds.length >= event.capacity) {
      throw new Error("Event is at capacity");
    }

    await updateDoc(ref, {
      rsvpMemberIds: [...rsvpMemberIds, memberId],
      attendeeCount: rsvpMemberIds.length + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}

export async function cancelRsvp(eventId: string, memberId: string): Promise<void> {
  try {
    const ref = doc(db!, educationEventsCollection, eventId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const event = snap.data() as EducationEvent;
    const rsvpMemberIds = event.rsvpMemberIds || [];

    const updatedRsvpIds = rsvpMemberIds.filter((id) => id !== memberId);

    await updateDoc(ref, {
      rsvpMemberIds: updatedRsvpIds,
      attendeeCount: updatedRsvpIds.length,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Silently fail
  }
}

export async function isRsvpd(eventId: string, memberId: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return false;

    const ref = doc(firestore, educationEventsCollection, eventId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return false;

    const event = snap.data() as EducationEvent;
    return (event.rsvpMemberIds || []).includes(memberId);
  } catch {
    return false;
  }
}

export async function getEventRsvpCount(eventId: string): Promise<number> {
  try {
    const event = await getEducationEvent(eventId);
    return event?.attendeeCount || 0;
  } catch {
    return 0;
  }
}

export async function listMemberRsvps(memberId: string): Promise<EducationEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, educationEventsCollection);
    const q = query(
      ref,
      where("rsvpMemberIds", "array-contains", memberId),
      orderBy("startDatetime", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as EducationEvent);
  } catch {
    return [];
  }
}

// ============================================
// EVENT ANALYTICS
// ============================================

export async function getEventStats(schoolId: string): Promise<{
  totalEvents: number;
  upcomingEvents: number;
  totalRsvps: number;
}> {
  try {
    const allEvents = await listEducationEvents({ schoolId, publishedOnly: false });
    const upcomingEvents = await listEducationEvents({ schoolId, publishedOnly: true, upcoming: true });

    const totalRsvps = allEvents.reduce((sum, event) => sum + (event.attendeeCount || 0), 0);

    return {
      totalEvents: allEvents.length,
      upcomingEvents: upcomingEvents.length,
      totalRsvps,
    };
  } catch {
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      totalRsvps: 0,
    };
  }
}
