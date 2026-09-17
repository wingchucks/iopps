import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

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
  descriptionFormat?: "plain-text";
  requirements?: string;
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  companyLogoUrl?: string;
  applicationUrl?: string;
  externalApplyUrl?: string;
  externalUrl?: string;
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
  hiringDetails?: import("@/lib/job-hiring-details").HiringDetails;
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
  const response = await fetch("/api/jobs", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load jobs");
  return (await response.json()).jobs;
}

export async function getJobById(id: string): Promise<Job | null> {
  const response = await fetch("/api/jobs/" + encodeURIComponent(id), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load job");
  return (await response.json()).job;
}

export async function getJobsByEmployer(employerId: string): Promise<Job[]> {
  return (await getJobs()).filter(job => [job.employerId, job.orgId].includes(employerId));
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

export async function getJobsByOrg(orgId: string): Promise<Job[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");
  const response = await fetch("/api/employer/jobs", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load organization jobs");
  return (await response.json()).jobs.filter((job: Job) => [job.orgId, job.employerId].includes(orgId));
}

export async function deleteJob(id: string): Promise<void> {
  await deleteDoc(doc(col, id));
}
