import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Job {
  id: string;
  title: string;
  slug?: string;
  employerName?: string;
  companyName?: string;
  orgName?: string;
  orgShort?: string;
  orgId?: string;
  authorId?: string;
  location?: string;
  employmentType?: string;
  jobType?: string;
  workLocation?: string;
  positions?: string;
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
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  companyLogoUrl?: string;
  applicationUrl?: string;
  externalApplyUrl?: string;
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
  indigenousPreferenceLevel?: string;
  communityTags?: string[];
  willTrain?: boolean;
  driversLicense?: boolean;
  requiresResume?: boolean;
  requiresCoverLetter?: boolean;
  requiresReferences?: boolean;
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

export async function getJobsByEmployer(employerId: string): Promise<Job[]> {
  const snap = await getDocs(
    query(col, where("employerId", "==", employerId), where("active", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
}

export async function createJob(
  data: Omit<Job, "id" | "createdAt" | "postedAt">
): Promise<string> {
  const slug =
    data.slug ||
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36);
  const ref = doc(col, slug);
  await setDoc(ref, {
    ...data,
    slug,
    active: data.status === "active",
    createdAt: serverTimestamp(),
    postedAt: data.status === "active" ? serverTimestamp() : null,
  });
  return slug;
}

export async function updateJob(
  id: string,
  data: Partial<Omit<Job, "id">>
): Promise<void> {
  const ref = doc(col, id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}
