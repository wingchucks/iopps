// Education Events Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  checkFirebase,
  educationEventsCollection,
  educationEventRSVPsCollection,
} from "./shared";
import type {
  EducationEvent,
  EducationEventType,
  EducationEventFormat,
  EducationEventRSVP,
} from "@/lib/types";

// ============================================
// EDUCATION EVENTS
// ============================================

export interface ListEducationEventsOptions {
  schoolId?: string;
  type?: EducationEventType;
  format?: EducationEventFormat;
  upcomingOnly?: boolean;
  publishedOnly?: boolean;
  isPublished?: boolean; // Alias for publishedOnly
  featured?: boolean;
  startAfter?: Date;
  startBefore?: Date;
  maxResults?: number;
}

/**
 * List education events with filters
 */
export async function listEducationEvents(
  options: ListEducationEventsOptions = {}
): Promise<EducationEvent[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, educationEventsCollection);
  const constraints: Parameters<typeof query>[1][] = [];

  if (options.schoolId) {
    constraints.push(where("schoolId", "==", options.schoolId));
  }

  if (options.type) {
    constraints.push(where("type", "==", options.type));
  }

  if (options.format) {
    constraints.push(where("format", "==", options.format));
  }

  // Default: only show published events for public listings
  // isPublished is an alias for publishedOnly
  const showPublishedOnly = options.isPublished ?? options.publishedOnly;
  if (showPublishedOnly !== false && !options.schoolId) {
    constraints.push(where("isPublished", "==", true));
  }

  if (options.featured) {
    constraints.push(where("featured", "==", true));
  }

  // Filter by date range
  if (options.startAfter) {
    constraints.push(where("startDatetime", ">=", options.startAfter));
  }

  if (options.startBefore) {
    constraints.push(where("startDatetime", "<=", options.startBefore));
  }

  // Default: order by start date
  constraints.push(orderBy("startDatetime", "asc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  let events = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EducationEvent[];

  // Client-side filtering for upcoming events
  if (options.upcomingOnly) {
    const now = new Date();
    events = events.filter((event) => {
      const startDate = event.startDatetime
        ? typeof event.startDatetime === "string"
          ? new Date(event.startDatetime)
          : event.startDatetime.toDate()
        : null;
      return startDate && startDate >= now;
    });
  }

  return events;
}

/**
 * Get a single education event by ID
 */
export async function getEducationEvent(
  eventId: string
): Promise<EducationEvent | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const docRef = doc(db!, educationEventsCollection, eventId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as EducationEvent;
}

/**
 * List events for a school (includes unpublished)
 */
export async function listSchoolEvents(
  schoolId: string
): Promise<EducationEvent[]> {
  return listEducationEvents({
    schoolId,
    publishedOnly: false,
  });
}

/**
 * Get upcoming events
 * @param daysAhead - Number of days to look ahead (default: unlimited)
 * @param maxResults - Maximum number of results (default: 10)
 */
export async function getUpcomingEducationEvents(
  daysAhead?: number,
  maxResults: number = 10
): Promise<EducationEvent[]> {
  const options: ListEducationEventsOptions = {
    upcomingOnly: true,
    maxResults,
  };

  if (daysAhead) {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    options.startBefore = future;
  }

  return listEducationEvents(options);
}

/**
 * Get events in a date range (for calendar view)
 */
export async function getEducationEventsInRange(
  startDate: Date,
  endDate: Date
): Promise<EducationEvent[]> {
  return listEducationEvents({
    startAfter: startDate,
    startBefore: endDate,
  });
}

/**
 * Create a new education event
 */
export async function createEducationEvent(
  data: Omit<
    EducationEvent,
    "id" | "createdAt" | "updatedAt" | "viewCount" | "registrationClicks" | "attendeeCount"
  >
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, educationEventsCollection);

  const docRef = await addDoc(colRef, {
    ...data,
    viewCount: 0,
    registrationClicks: 0,
    attendeeCount: 0,
    attendeeIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an education event
 */
export async function updateEducationEvent(
  eventId: string,
  data: Partial<Omit<EducationEvent, "id" | "createdAt">>
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationEventsCollection, eventId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Publish or unpublish an event
 */
export async function setEducationEventPublished(
  eventId: string,
  isPublished: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationEventsCollection, eventId);
  await updateDoc(docRef, {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Set featured status for an event
 */
export async function setEducationEventFeatured(
  eventId: string,
  featured: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationEventsCollection, eventId);
  await updateDoc(docRef, {
    featured,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an education event
 */
export async function deleteEducationEvent(eventId: string): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationEventsCollection, eventId);
  await deleteDoc(docRef);
}

/**
 * Increment view count for an event
 */
export async function incrementEducationEventViews(
  eventId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, educationEventsCollection, eventId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      viewCount: (snapshot.data().viewCount || 0) + 1,
    });
  }
}

/**
 * Track registration click
 */
export async function trackEducationEventRegistrationClick(
  eventId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, educationEventsCollection, eventId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      registrationClicks: (snapshot.data().registrationClicks || 0) + 1,
    });
  }
}

// ============================================
// EVENT RSVP
// ============================================

/**
 * RSVP to an event
 */
export async function rsvpToEducationEvent(
  eventId: string,
  memberId: string,
  memberEmail: string,
  memberName: string,
  status: "going" | "maybe" | "not_going" = "going"
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  // Check if already RSVP'd
  const existing = await getEducationEventRSVP(eventId, memberId);

  if (existing) {
    // Update existing RSVP
    await updateEducationEventRSVP(existing.id, status);
    return existing.id;
  }

  // Create new RSVP
  const colRef = collection(db!, educationEventRSVPsCollection);
  const docRef = await addDoc(colRef, {
    eventId,
    memberId,
    memberEmail,
    memberName,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update event attendee count and list
  if (status === "going") {
    const eventRef = doc(db!, educationEventsCollection, eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const data = eventSnap.data();
      const attendeeIds = data.attendeeIds || [];
      if (!attendeeIds.includes(memberId)) {
        attendeeIds.push(memberId);
        await updateDoc(eventRef, {
          attendeeIds,
          attendeeCount: attendeeIds.length,
        });
      }
    }
  }

  return docRef.id;
}

/**
 * Update an existing RSVP
 */
export async function updateEducationEventRSVP(
  rsvpId: string,
  status: "going" | "maybe" | "not_going"
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationEventRSVPsCollection, rsvpId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel an RSVP
 */
export async function cancelEducationEventRSVP(
  eventId: string,
  memberId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const existing = await getEducationEventRSVP(eventId, memberId);
  if (existing) {
    const docRef = doc(db!, educationEventRSVPsCollection, existing.id);
    await deleteDoc(docRef);

    // Update event attendee count and list
    const eventRef = doc(db!, educationEventsCollection, eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const data = eventSnap.data();
      const attendeeIds = (data.attendeeIds || []).filter(
        (id: string) => id !== memberId
      );
      await updateDoc(eventRef, {
        attendeeIds,
        attendeeCount: attendeeIds.length,
      });
    }
  }
}

/**
 * Get RSVP for an event by member
 */
export async function getEducationEventRSVP(
  eventId: string,
  memberId: string
): Promise<EducationEventRSVP | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, educationEventRSVPsCollection);
  const q = query(
    colRef,
    where("eventId", "==", eventId),
    where("memberId", "==", memberId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as EducationEventRSVP;
}

/**
 * List RSVPs for an event
 */
export async function listEducationEventRSVPs(
  eventId: string,
  status?: "going" | "maybe" | "not_going"
): Promise<EducationEventRSVP[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, educationEventRSVPsCollection);
  const constraints: Parameters<typeof query>[1][] = [
    where("eventId", "==", eventId),
  ];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EducationEventRSVP[];
}

/**
 * List member's event RSVPs
 */
export async function listMemberEventRSVPs(
  memberId: string
): Promise<EducationEventRSVP[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, educationEventRSVPsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EducationEventRSVP[];
}

/**
 * Get RSVP count for an event
 */
export async function getEducationEventRSVPCount(
  eventId: string,
  status: "going" | "maybe" | "not_going" = "going"
): Promise<number> {
  const fbApp = checkFirebase();
  if (!fbApp) return 0;

  const colRef = collection(db!, educationEventRSVPsCollection);
  const q = query(
    colRef,
    where("eventId", "==", eventId),
    where("status", "==", status)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Check if member has RSVP'd to an event
 */
export async function hasMemberRSVP(
  eventId: string,
  memberId: string
): Promise<boolean> {
  const rsvp = await getEducationEventRSVP(eventId, memberId);
  return rsvp !== null && rsvp.status === "going";
}
