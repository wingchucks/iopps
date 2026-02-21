import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Job {
  id: string;
  title: string;
  employerName?: string;
  companyName?: string;
  orgName?: string;
  orgShort?: string;
  location?: string;
  employmentType?: string;
  jobType?: string;
  salary?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    period?: string;
    currency?: string;
    disclosed?: boolean;
  };
  description?: string;
  requirements?: string;
  companyLogoUrl?: string;
  applicationUrl?: string;
  contactEmail?: string;
  featured?: boolean;
  active?: boolean;
  status?: string;
  source?: string;
  closingDate?: string;
  expiresAt?: unknown;
  createdAt?: unknown;
  postedAt?: unknown;
  order?: number;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  employerId?: string;
  category?: string;
  department?: string;
}

const col = collection(db, "jobs");

export async function getJobs(): Promise<Job[]> {
  const constraints: QueryConstraint[] = [
    where("active", "==", true),
  ];

  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
}

export async function getJobById(id: string): Promise<Job | null> {
  const snap = await getDoc(doc(col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Job;
}
