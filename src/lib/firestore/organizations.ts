import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  type: "employer" | "school" | "business";
  tier: "premium" | "school" | "standard";
  location: string;
  website?: string;
  description: string;
  openJobs: number;
  employees?: string;
  since: string;
  verified: boolean;
  tags: string[];
}

const col = collection(db, "organizations");

export async function getOrganizations(): Promise<Organization[]> {
  const snap = await getDocs(query(col, orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Organization);
}

export async function getOrganization(
  id: string
): Promise<Organization | null> {
  const snap = await getDoc(doc(db, "organizations", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Organization;
}

export async function setOrganization(
  id: string,
  data: Omit<Organization, "id">
): Promise<void> {
  await setDoc(doc(db, "organizations", id), data);
}

export async function deleteOrganization(id: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", id));
}
