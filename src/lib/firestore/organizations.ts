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
  type: "business" | "school" | "non-profit" | "government" | "employer";
  contactName?: string;
  contactEmail?: string;
  logo?: string;
  logoUrl?: string;
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
  createdAt?: unknown;
  updatedAt?: unknown;
  onboardingComplete?: boolean;
  plan?: string | null;
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

export async function createOrganization(
  orgId: string,
  data: {
    name: string;
    type: Organization["type"];
    contactName: string;
    contactEmail: string;
  }
): Promise<void> {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);

  const now = serverTimestamp();

  // 1. Create organizations/{orgId}
  await setDoc(doc(db, "organizations", orgId), {
    ...data,
    slug,
    onboardingComplete: false,
    plan: null,
    status: "pending",
    verified: false,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Create employers/{orgId}
  await setDoc(doc(db, "employers", orgId), {
    id: orgId,
    name: data.name,
    type: data.type,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    plan: "free",
    subscriptionTier: "free",
    status: "pending",
    verified: false,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Set user role to employer in users collection
  await setDoc(doc(db, "users", orgId), {
    role: "employer",
    employerId: orgId,
    displayName: data.contactName,
    email: data.contactEmail,
    updatedAt: now,
  }, { merge: true });

  // 4. Create members/{orgId} with orgId so they're filtered from talent search
  await setDoc(doc(db, "members", orgId), {
    displayName: data.name,
    email: data.contactEmail,
    orgId: orgId,
    role: "employer",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
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
