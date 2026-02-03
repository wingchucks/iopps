// Powwow-related Firestore operations
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
  powwowsCollection,
  powwowRegistrationsCollection,
  checkFirebase,
} from "./shared";
import type { PowwowEvent, PowwowRegistration } from "@/lib/types";

// Helper to convert various timestamp formats to Date
// Handles date-only strings (YYYY-MM-DD) as local time, not UTC
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") {
    // If it's a date-only string (YYYY-MM-DD), parse as local time not UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
      const [year, month, day] = timestamp.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(timestamp);
  }
  return null;
}

// Check if a pow wow has ended based on endDate
export function isPowwowExpired(powwow: PowwowEvent): boolean {
  const now = new Date();
  const endDate = toDate(powwow.endDate);
  if (endDate && endDate < now) return true;
  return false;
}

type PowwowInput = Omit<
  PowwowEvent,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createPowwowEvent(
  input: PowwowInput
): Promise<string> {
  const ref = collection(db!, powwowsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, powwowsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listPowwowEvents(options: { includeExpired?: boolean } = {}): Promise<PowwowEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, powwowsCollection);
    const q = query(ref, where("active", "==", true), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    let powwows = snap.docs.map((docSnap) => docSnap.data() as PowwowEvent);

    // Client-side filtering for expired pow wows (safety net)
    if (!options.includeExpired) {
      powwows = powwows.filter(p => !isPowwowExpired(p));
    }

    return powwows;
  } catch {
    return [];
  }
}

export async function updatePowwowEvent(
  id: string,
  data: Partial<PowwowEvent>
) {
  const ref = doc(db!, powwowsCollection, id);
  await updateDoc(ref, data);
}

export async function listEmployerPowwows(employerId: string): Promise<PowwowEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];
    const ref = collection(firestore, powwowsCollection);
    const q = query(ref, where("employerId", "==", employerId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PowwowEvent));
  } catch {
    return [];
  }
}

export async function deletePowwow(id: string): Promise<void> {
  const ref = doc(db!, powwowsCollection, id);
  await deleteDoc(ref);
}

export async function getPowwowEvent(id: string): Promise<PowwowEvent | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return null;
    }
    const ref = doc(firestore, powwowsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PowwowEvent;
  } catch {
    return null;
  }
}

// Powwow Registration
type PowwowRegistrationInput = Omit<
  PowwowRegistration,
  "id" | "createdAt"
>;

export async function createPowwowRegistration(
  input: PowwowRegistrationInput
): Promise<string> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, powwowRegistrationsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listMemberPowwowRegistrations(
  memberId: string
): Promise<PowwowRegistration[]> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const q = query(
    ref,
    where("email", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as PowwowRegistration;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listPowwowRegistrants(
  employerId: string,
  powwowId?: string
): Promise<PowwowRegistration[]> {
  const ref = collection(db!, powwowRegistrationsCollection);
  const constraints: any[] = [where("employerId", "==", employerId)];
  if (powwowId) {
    constraints.push(where("powwowId", "==", powwowId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as PowwowRegistration;
    return { ...data, id: docSnapshot.id };
  });
}
