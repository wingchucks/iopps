import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export interface OrganizationLocation {
  city: string;
  province: string;
}

export interface OrganizationSocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  type: "business" | "school" | "non-profit" | "government" | "employer" | "legal" | "professional";
  contactName?: string;
  contactEmail?: string;
  logo?: string;
  logoUrl?: string;
  bannerUrl?: string;
  description: string;
  foundedYear?: number;
  communityAffiliation?: string;
  industry?: string;
  size?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location?: any;
  website?: string;
  services?: string[];
  hiringStatus?: string;
  partnershipInterests?: string[];
  phone?: string;
  address?: string;
  socialLinks?: OrganizationSocialLinks;
  // School-specific fields
  institutionType?: string;
  studentBodySize?: string;
  accreditation?: string;
  campusCount?: number;
  enrollmentStatus?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  onboardingComplete?: boolean;
  plan?: string | null;
  emailTemplates?: Record<string, string>;
  // Legacy fields used by admin/seed pages
  shortName: string;
  tier: "premium" | "school" | "standard";
  openJobs: number;
  employees?: string;
  since: string;
  verified: boolean;
  tags: string[];
  programCount?: number;
  programs?: string[];
}

/**
 * @deprecated Use POST /api/employer/signup instead for new employer registration.
 * This client-side function only creates the organizations doc.
 * The server-side route handles all 4 collections atomically with Admin SDK.
 */
export async function createOrganization(
  orgId: string,
  data: {
    name: string;
    type: Organization["type"];
    contactName: string;
    contactEmail: string;
  }
): Promise<void> {
  await setDoc(doc(db, "organizations", orgId), {
    ...data,
    onboardingComplete: false,
    plan: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getOrganization(
  orgId: string
): Promise<Organization | null> {
  const snap = await getDoc(doc(db, "organizations", orgId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Organization;
}

export async function updateOrganization(
  orgId: string,
  data: Partial<Omit<Organization, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getOrganizations(): Promise<Organization[]> {
  const snap = await getDocs(
    query(collection(db, "organizations"), orderBy("name"))
  );
  // Filter client-side to only show verified orgs (avoids Firestore composite index)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Organization)
    .filter((org) => org.verified === true);
}

// Used by admin pages for seeding/managing orgs
export async function setOrganization(
  id: string,
  data: Omit<Organization, "id">
): Promise<void> {
  await setDoc(doc(db, "organizations", id), data);
}

export async function deleteOrganization(id: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", id));
}
