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

export async function listPowwowEvents(): Promise<PowwowEvent[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, powwowsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as PowwowEvent);
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
