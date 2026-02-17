import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Organization } from "@/lib/types";

const col = () => collection(db!, "organizations");

export async function getOrganization(id: string): Promise<Organization | null> {
  const snap = await getDoc(doc(db!, "organizations", id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Organization) : null;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const snap = await getDocs(query(col(), where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), id: d.id } as Organization;
}

export async function createOrganization(data: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(col(), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updateOrganization(id: string, data: Partial<Organization>): Promise<void> {
  await updateDoc(doc(db!, "organizations", id), { ...data, updatedAt: Timestamp.now() });
}

export async function getPendingOrganizations(): Promise<Organization[]> {
  const snap = await getDocs(query(col(), where("verification", "==", "unverified"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Organization));
}

export async function getPartnerOrganizations(): Promise<Organization[]> {
  const snap = await getDocs(query(col(), where("subscription.tier", "in", ["tier2", "school"]), where("disabled", "==", false)));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Organization));
}
