import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import { isPublicScholarshipVisible } from "@/lib/access-state";

export interface Scholarship {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  eligibility?: string;
  amount?: string;
  deadline?: string;
  organization?: string;
  orgId?: string;
  orgName?: string;
  orgShort?: string;
  authorId?: string;
  url?: string;
  applicationUrl?: string;
  applicationInstructions?: string;
  applyMethod?: string;
  requirements?: string[];
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  category?: string;
  // Scholarship/Bursary-specific
  educationLevel?: string;
  fieldOfStudy?: string[];
  gpaRequired?: string;
  numberOfAwards?: string;
  renewable?: string;
  indigenousSpecific?: string;
  financialNeed?: string;
  priorityGroups?: string[];
  // Business grant-specific
  businessStage?: string;
  industrySector?: string[];
  fundingUse?: string[];
  matchingFunds?: string;
  indigenousOwnership?: string;
  businessPlanRequired?: string;
  maxFundingPerApplicant?: string;
  // Community grant-specific
  projectType?: string[];
  applicantType?: string[];
  communitySize?: string;
  projectDuration?: string;
  reportingRequired?: string;
  status?: string;
  active?: boolean;
  featured?: boolean;
  badges?: string[];
  source?: string;
  createdAt?: unknown;
  order?: number;
}

const col = collection(db, "scholarships");

function normalizeScholarship(id: string, data: Record<string, unknown>): Scholarship {
  const normalized = { id, ...data } as Scholarship;
  if (!normalized.slug) normalized.slug = id;
  if (!normalized.orgName && typeof data.organization === "string") {
    normalized.orgName = data.organization;
  }
  if (!normalized.applicationUrl && typeof data.url === "string") {
    normalized.applicationUrl = data.url;
  }
  return normalized;
}

export async function getScholarships(): Promise<Scholarship[]> {
  const constraints: QueryConstraint[] = [orderBy("order", "asc")];
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs
    .map((d) => normalizeScholarship(d.id, d.data()))
    .filter((scholarship) => isPublicScholarshipVisible(scholarship));
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  const snap = await getDoc(doc(col, id));
  if (!snap.exists()) return null;
  const scholarship = normalizeScholarship(snap.id, snap.data());
  return isPublicScholarshipVisible(scholarship) ? scholarship : null;
}

export async function getScholarshipBySlug(
  slug: string
): Promise<Scholarship | null> {
  const byId = await getDoc(doc(col, slug));
  if (byId.exists()) {
    const scholarship = normalizeScholarship(byId.id, byId.data());
    if (isPublicScholarshipVisible(scholarship)) {
      return scholarship;
    }
  }

  const snap = await getDocs(query(col, where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  const scholarship = normalizeScholarship(d.id, d.data());
  return isPublicScholarshipVisible(scholarship) ? scholarship : null;
}

export async function getScholarshipsByOrg(orgId: string): Promise<Scholarship[]> {
  const snap = await getDocs(query(col, where("orgId", "==", orgId)));
  return snap.docs.map((d) => normalizeScholarship(d.id, d.data()));
}

export async function createScholarship(
  data: Omit<Scholarship, "id" | "createdAt" | "order">
): Promise<string> {
  const id =
    data.slug ||
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  await setDoc(doc(col, id), {
    ...data,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
  return id;
}

export async function updateScholarship(
  id: string,
  data: Partial<Omit<Scholarship, "id">>
): Promise<void> {
  await updateDoc(doc(col, id), data);
}

export async function deleteScholarship(id: string): Promise<void> {
  await deleteDoc(doc(col, id));
}
