// Conference-related Firestore operations
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
  db,
  conferencesCollection,
  savedConferencesCollection,
  conferenceRegistrationsCollection,
  checkFirebase,
} from "./shared";
import type { Conference, ConferenceRegistration } from "@/lib/types";
import { MOCK_CONFERENCES } from "../mockData";

// Helper to convert various timestamp formats to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

// Check if a conference has ended based on endDate
export function isConferenceExpired(conference: Conference): boolean {
  const now = new Date();
  const endDate = toDate(conference.endDate);
  if (endDate && endDate < now) return true;
  return false;
}

type ConferenceInput = Omit<
  Conference,
  "id" | "createdAt" | "active" | "employerId"
> & { employerId: string; active?: boolean };

export async function createConference(input: ConferenceInput): Promise<string> {
  const ref = collection(db!, conferencesCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, conferencesCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listConferences(options: { includeExpired?: boolean } = {}): Promise<Conference[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      let conferences = [...MOCK_CONFERENCES];
      if (!options.includeExpired) {
        conferences = conferences.filter(c => c.active !== false && !isConferenceExpired(c));
      }
      return conferences;
    }
    const ref = collection(firestore, conferencesCollection);
    const q = query(ref, where("active", "==", true), orderBy("startDate", "asc"));
    const snap = await getDocs(q);
    let conferences = snap.docs.map((docSnap) => docSnap.data() as Conference);

    // Client-side filtering for expired conferences (safety net)
    if (!options.includeExpired) {
      conferences = conferences.filter(c => !isConferenceExpired(c));
    }

    return conferences;
  } catch {
    return [];
  }
}

export async function listEmployerConferences(
  employerId: string
): Promise<Conference[]> {
  const ref = collection(db!, conferencesCollection);
  const q = query(
    ref,
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.data() as Conference);
}

export async function getConference(id: string): Promise<Conference | null> {
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_CONFERENCES.find(c => c.id === id) || null;
  }
  const ref = doc(firestore, conferencesCollection, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Conference;
}

export async function updateConference(
  id: string,
  data: Partial<Conference>
) {
  const ref = doc(db!, conferencesCollection, id);
  await updateDoc(ref, data);
}

export async function deleteConference(id: string) {
  const ref = doc(db!, conferencesCollection, id);
  await deleteDoc(ref);
}

// Saved Conferences
export type SavedConference = {
  id?: string;
  memberId: string;
  conferenceId: string;
  createdAt?: any;
  conference?: Conference | null;
};

export async function toggleSavedConference(
  memberId: string,
  conferenceId: string,
  shouldSave: boolean
) {
  const snapshot = await getDocs(
    query(
      collection(db!, savedConferencesCollection),
      where("memberId", "==", memberId),
      where("conferenceId", "==", conferenceId)
    )
  );

  if (shouldSave) {
    if (snapshot.empty) {
      await addDoc(collection(db!, savedConferencesCollection), {
        memberId,
        conferenceId,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
}

export async function listSavedConferences(
  memberId: string
): Promise<SavedConference[]> {
  const ref = collection(db!, savedConferencesCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  const results: SavedConference[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as SavedConference;
    const conference = await getConference(data.conferenceId);
    results.push({
      ...data,
      id: docSnap.id,
      conference,
    });
  }
  return results;
}

export async function listSavedConferenceIds(memberId: string): Promise<string[]> {
  const ref = collection(db!, savedConferencesCollection);
  const q = query(ref, where("memberId", "==", memberId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as SavedConference;
    return data.conferenceId;
  });
}

// Conference Registration
type ConferenceRegistrationInput = Omit<
  ConferenceRegistration,
  "id" | "createdAt"
>;

export async function createConferenceRegistration(
  input: ConferenceRegistrationInput
): Promise<string> {
  const ref = collection(db!, conferenceRegistrationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, conferenceRegistrationsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}
