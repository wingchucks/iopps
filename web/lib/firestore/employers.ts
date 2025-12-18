// Employer-related Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  db,
  employerCollection,
  checkFirebase,
} from "./shared";
import type { EmployerProfile, Interview, EmployerStatus, CompanyVideo, GrantType, FreePostingGrant } from "@/lib/types";
import { MOCK_EMPLOYERS } from "../mockData";

/**
 * Check if an employer profile has all required fields completed.
 * Required: organizationName, description, location, logoUrl
 */
export function isProfileComplete(profile: EmployerProfile | null | undefined): boolean {
  if (!profile) return false;
  return !!(
    profile.organizationName?.trim() &&
    profile.description?.trim() &&
    profile.location?.trim() &&
    profile.logoUrl?.trim()
  );
}

/**
 * Get which required fields are missing from the profile
 */
export function getMissingProfileFields(profile: EmployerProfile | null | undefined): string[] {
  if (!profile) return ["Organization Name", "Description", "Location", "Logo"];

  const missing: string[] = [];
  if (!profile.organizationName?.trim()) missing.push("Organization Name");
  if (!profile.description?.trim()) missing.push("Description");
  if (!profile.location?.trim()) missing.push("Location");
  if (!profile.logoUrl?.trim()) missing.push("Logo");

  return missing;
}

export async function getEmployerProfile(
  userId: string
): Promise<EmployerProfile | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_EMPLOYERS.find(e => e.userId === userId || e.id === userId) || MOCK_EMPLOYERS[0];
    }
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as EmployerProfile;
  } catch {
    return null;
  }
}

export async function updateEmployerLogo(userId: string, logoUrl: string) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      logoUrl,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      organizationName: "",
      description: "",
      website: "",
      location: "",
      logoUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function upsertEmployerProfile(
  userId: string,
  data: Omit<EmployerProfile, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const ref = doc(db!, employerCollection, userId);
  const base: Record<string, any> = {
    organizationName: data.organizationName,
    description: data.description ?? "",
    website: data.website ?? "",
    location: data.location ?? "",
    logoUrl: data.logoUrl ?? "",
  };

  // Add enhanced profile fields if provided
  if (data.bannerUrl !== undefined) base.bannerUrl = data.bannerUrl;
  if (data.socialLinks !== undefined) base.socialLinks = data.socialLinks;
  if (data.industry !== undefined) base.industry = data.industry;
  if (data.companySize !== undefined) base.companySize = data.companySize;
  if (data.foundedYear !== undefined) base.foundedYear = data.foundedYear;
  if (data.contactEmail !== undefined) base.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) base.contactPhone = data.contactPhone;

  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...base,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: userId,
      userId,
      ...base,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function listEmployers(status?: EmployerStatus, includeDeleted = false): Promise<EmployerProfile[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_EMPLOYERS;
    }
    const ref = collection(firestore, employerCollection);
    let q;

    if (status) {
      q = query(ref, where("status", "==", status), orderBy("createdAt", "desc"));
    } else {
      q = query(ref, orderBy("createdAt", "desc"));
    }

    const snap = await getDocs(q);
    let results = snap.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as EmployerProfile));

    // Filter out soft-deleted employers unless explicitly requested
    if (!includeDeleted) {
      results = results.filter((employer) => !(employer as any).deletedAt);
    }

    return results;
  } catch (error) {
    console.error("[listEmployers] Error:", error);
    return [];
  }
}

export async function updateEmployerStatus(
  userId: string,
  status: EmployerStatus,
  approvedBy?: string,
  rejectionReason?: string
) {
  const ref = doc(db!, employerCollection, userId);
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "approved") {
    updates.approvedAt = serverTimestamp();
    updates.approvedBy = approvedBy;
  }

  if (status === "rejected" && rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }

  await updateDoc(ref, updates);
}

export interface GrantFreePostingParams {
  userId: string;
  adminId: string;
  grantType: GrantType;
  reason?: string;
  quantity?: number; // For single/featured: number of credits
  durationDays?: number; // For tier1/tier2: duration in days (default 365)
}

// Grant configurations based on type
const GRANT_CONFIGS: Record<GrantType, {
  jobCredits: number;
  featuredCredits: number;
  unlimitedPosts: boolean;
  defaultDuration: number;
  label: string;
}> = {
  single: {
    jobCredits: 1, // Will be multiplied by quantity
    featuredCredits: 0,
    unlimitedPosts: false,
    defaultDuration: 365,
    label: "Single Job Post",
  },
  featured: {
    jobCredits: 0,
    featuredCredits: 1, // Will be multiplied by quantity
    unlimitedPosts: false,
    defaultDuration: 365,
    label: "Featured Job Ad",
  },
  tier1: {
    jobCredits: 15,
    featuredCredits: 15,
    unlimitedPosts: false,
    defaultDuration: 365,
    label: "Tier 1 – Basic Visibility",
  },
  tier2: {
    jobCredits: -1, // Unlimited
    featuredCredits: 5,
    unlimitedPosts: true,
    defaultDuration: 365,
    label: "Tier 2 – Unlimited + Shop",
  },
};

export function getGrantConfig(grantType: GrantType) {
  return GRANT_CONFIGS[grantType];
}

export async function grantEmployerFreePosting(params: GrantFreePostingParams) {
  const { userId, adminId, grantType, reason, quantity = 1, durationDays } = params;
  const config = GRANT_CONFIGS[grantType];

  // Calculate credits based on grant type
  let jobCredits = config.jobCredits;
  let featuredCredits = config.featuredCredits;

  // For single/featured, multiply by quantity
  if (grantType === "single") {
    jobCredits = quantity;
  } else if (grantType === "featured") {
    featuredCredits = quantity;
  }

  // Calculate expiration date
  const duration = durationDays || config.defaultDuration;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
  );

  const freePostingGrant: Omit<FreePostingGrant, "grantedAt"> & { grantedAt: ReturnType<typeof serverTimestamp> } = {
    enabled: true,
    grantType,
    reason: reason || `Admin granted ${config.label}`,
    jobCredits,
    jobCreditsUsed: 0,
    featuredCredits,
    featuredCreditsUsed: 0,
    unlimitedPosts: config.unlimitedPosts,
    grantedAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
    expiresAt,
    grantedBy: adminId,
  };

  const ref = doc(db!, employerCollection, userId);
  await updateDoc(ref, {
    // Keep legacy fields for backward compatibility
    freePostingEnabled: true,
    freePostingReason: reason || `Admin granted ${config.label}`,
    freePostingGrantedAt: serverTimestamp(),
    freePostingGrantedBy: adminId,
    // New enhanced grant data
    freePostingGrant,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeEmployerFreePosting(userId: string) {
  const ref = doc(db!, employerCollection, userId);
  await updateDoc(ref, {
    // Clear legacy fields
    freePostingEnabled: false,
    freePostingReason: null,
    freePostingGrantedAt: null,
    freePostingGrantedBy: null,
    // Clear enhanced grant
    freePostingGrant: null,
    updatedAt: serverTimestamp(),
  });
}

// Helper to check if a grant is still valid
export function isGrantValid(grant: FreePostingGrant | undefined): boolean {
  if (!grant || !grant.enabled) return false;
  if (!grant.expiresAt) return true;

  const expiresAt = grant.expiresAt instanceof Timestamp
    ? grant.expiresAt.toDate()
    : new Date(grant.expiresAt as unknown as string);

  return expiresAt > new Date();
}

// Helper to check remaining credits
export function getGrantRemainingCredits(grant: FreePostingGrant | undefined): {
  jobCredits: number;
  featuredCredits: number;
  unlimitedPosts: boolean;
} {
  if (!grant || !isGrantValid(grant)) {
    return { jobCredits: 0, featuredCredits: 0, unlimitedPosts: false };
  }

  return {
    jobCredits: grant.unlimitedPosts ? -1 : Math.max(0, grant.jobCredits - grant.jobCreditsUsed),
    featuredCredits: Math.max(0, grant.featuredCredits - grant.featuredCreditsUsed),
    unlimitedPosts: grant.unlimitedPosts,
  };
}

export async function addEmployerInterview(
  userId: string,
  interview: Omit<Interview, "id" | "createdAt">
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const newInterview: Interview = {
    ...interview,
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    createdAt: serverTimestamp() as Timestamp,
  };

  await updateDoc(ref, {
    interviews: [...interviews, newInterview],
    updatedAt: serverTimestamp(),
  });

  return newInterview.id;
}

export async function updateEmployerInterview(
  userId: string,
  interviewId: string,
  updates: Partial<Omit<Interview, "id" | "createdAt">>
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const updatedInterviews = interviews.map(interview =>
    interview.id === interviewId
      ? { ...interview, ...updates }
      : interview
  );

  await updateDoc(ref, {
    interviews: updatedInterviews,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployerInterview(
  userId: string,
  interviewId: string
) {
  const ref = doc(db!, employerCollection, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  const profile = snap.data() as EmployerProfile;
  const interviews = profile.interviews || [];

  const filteredInterviews = interviews.filter(
    interview => interview.id !== interviewId
  );

  await updateDoc(ref, {
    interviews: filteredInterviews,
    updatedAt: serverTimestamp(),
  });
}

export async function trackInterviewView(
  employerId: string,
  interviewId: string
) {
  if (!db) return;
  try {
    const ref = doc(db!, employerCollection, employerId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const profile = snap.data() as EmployerProfile;
      const interviews = profile.interviews || [];

      const updatedInterviews = interviews.map(interview =>
        interview.id === interviewId
          ? { ...interview, viewsCount: (interview.viewsCount || 0) + 1 }
          : interview
      );

      await updateDoc(ref, {
        interviews: updatedInterviews,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Failed to track interview view:", err);
  }
}

export async function setEmployerCompanyIntro(
  employerId: string,
  videoData: CompanyVideo
) {
  const ref = doc(db!, employerCollection, employerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  await updateDoc(ref, {
    companyIntroVideo: videoData,
    updatedAt: serverTimestamp(),
  });
}

export async function removeEmployerCompanyIntro(employerId: string) {
  const ref = doc(db!, employerCollection, employerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Employer profile not found");

  await updateDoc(ref, {
    companyIntroVideo: null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateEmployerCarouselFeature(
  employerId: string,
  featured: boolean
) {
  const ref = doc(db!, employerCollection, employerId);
  await updateDoc(ref, {
    featuredOnCarousel: featured,
    updatedAt: serverTimestamp(),
  });
}
