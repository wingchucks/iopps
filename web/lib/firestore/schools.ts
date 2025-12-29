// School Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  checkFirebase,
  schoolsCollection,
  savedSchoolsCollection,
  schoolInquiriesCollection,
} from "./shared";
import type {
  School,
  SchoolStatus,
  SchoolType,
  SavedSchool,
  SchoolInquiry,
} from "@/lib/types";

// ============================================
// SCHOOLS
// ============================================

export interface ListSchoolsOptions {
  organizationId?: string;
  type?: SchoolType;
  province?: string;
  status?: SchoolStatus;
  publishedOnly?: boolean;
  indigenousControlled?: boolean;
  hasElderInResidence?: boolean;
  featured?: boolean;
  maxResults?: number;
}

/**
 * List schools with filters
 */
export async function listSchools(
  options: ListSchoolsOptions = {}
): Promise<School[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, schoolsCollection);
  const constraints: Parameters<typeof query>[1][] = [];

  if (options.organizationId) {
    constraints.push(where("organizationId", "==", options.organizationId));
  }

  if (options.type) {
    constraints.push(where("type", "==", options.type));
  }

  if (options.province) {
    constraints.push(where("headOffice.province", "==", options.province));
  }

  if (options.status) {
    constraints.push(where("status", "==", options.status));
  }

  // Default: only show published schools for public listings
  if (options.publishedOnly !== false && !options.organizationId) {
    constraints.push(where("isPublished", "==", true));
    constraints.push(where("status", "==", "active"));
  }

  if (options.indigenousControlled !== undefined) {
    constraints.push(where("verification.indigenousControlled", "==", options.indigenousControlled));
  }

  if (options.hasElderInResidence) {
    constraints.push(where("indigenousServices.elderInResidence", "==", true));
  }

  constraints.push(orderBy("name", "asc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as School[];
}

/**
 * Get a single school by ID
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const docRef = doc(db!, schoolsCollection, schoolId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as School;
}

/**
 * Get a school by slug
 */
export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, schoolsCollection);
  const q = query(
    colRef,
    where("slug", "==", slug),
    where("isPublished", "==", true),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as School;
}

/**
 * Get school by organization ID
 */
export async function getSchoolByOrganizationId(
  organizationId: string
): Promise<School | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, schoolsCollection);
  const q = query(
    colRef,
    where("organizationId", "==", organizationId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as School;
}

/**
 * Create a new school
 */
export async function createSchool(
  data: Omit<School, "id" | "createdAt" | "updatedAt" | "viewCount">
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, schoolsCollection);

  const docRef = await addDoc(colRef, {
    ...data,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a school
 */
export async function updateSchool(
  schoolId: string,
  data: Partial<Omit<School, "id" | "createdAt">>
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolsCollection, schoolId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update school status
 */
export async function updateSchoolStatus(
  schoolId: string,
  status: SchoolStatus
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolsCollection, schoolId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Publish or unpublish a school
 */
export async function setSchoolPublished(
  schoolId: string,
  isPublished: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolsCollection, schoolId);
  await updateDoc(docRef, {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a school
 */
export async function deleteSchool(schoolId: string): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolsCollection, schoolId);
  await deleteDoc(docRef);
}

/**
 * Increment view count for a school
 */
export async function incrementSchoolViews(schoolId: string): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, schoolsCollection, schoolId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      viewCount: (snapshot.data().viewCount || 0) + 1,
    });
  }
}

/**
 * Verify a school (admin only)
 */
export async function verifySchool(
  schoolId: string,
  verifiedBy: string,
  indigenousControlled?: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolsCollection, schoolId);
  await updateDoc(docRef, {
    "verification.isVerified": true,
    "verification.verifiedDate": serverTimestamp(),
    "verification.verifiedBy": verifiedBy,
    ...(indigenousControlled !== undefined && {
      "verification.indigenousControlled": indigenousControlled,
    }),
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// SAVED SCHOOLS (Member bookmarks)
// ============================================

/**
 * Save a school for a member
 */
export async function saveSchool(
  memberId: string,
  schoolId: string
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  // Check if already saved
  const existing = await getSavedSchool(memberId, schoolId);
  if (existing) return existing.id;

  const colRef = collection(db!, savedSchoolsCollection);
  const docRef = await addDoc(colRef, {
    memberId,
    schoolId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Remove a saved school
 */
export async function unsaveSchool(
  memberId: string,
  schoolId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const existing = await getSavedSchool(memberId, schoolId);
  if (existing) {
    const docRef = doc(db!, savedSchoolsCollection, existing.id);
    await deleteDoc(docRef);
  }
}

/**
 * Get a saved school record
 */
export async function getSavedSchool(
  memberId: string,
  schoolId: string
): Promise<SavedSchool | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, savedSchoolsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    where("schoolId", "==", schoolId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as SavedSchool;
}

/**
 * Check if a school is saved
 */
export async function isSchoolSaved(
  memberId: string,
  schoolId: string
): Promise<boolean> {
  const saved = await getSavedSchool(memberId, schoolId);
  return saved !== null;
}

/**
 * List all saved schools for a member
 */
export async function listSavedSchools(
  memberId: string
): Promise<SavedSchool[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, savedSchoolsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const savedItems = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SavedSchool[];

  // Fetch school details
  const schoolPromises = savedItems.map(async (item) => {
    const school = await getSchool(item.schoolId);
    return { ...item, school };
  });

  return Promise.all(schoolPromises);
}

// ============================================
// SCHOOL INQUIRIES
// ============================================

export interface CreateSchoolInquiryInput {
  schoolId: string;
  programId?: string;
  memberId: string;
  memberEmail: string;
  memberName: string;
  subject: string;
  message: string;
  interestedInPrograms?: string[];
  intendedStartDate?: string;
  educationLevel?: string;
}

/**
 * Create a school inquiry
 */
export async function createSchoolInquiry(
  data: CreateSchoolInquiryInput
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, schoolInquiriesCollection);
  const docRef = await addDoc(colRef, {
    ...data,
    status: "new",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * List inquiries for a school
 */
export async function listSchoolInquiries(
  schoolId: string,
  status?: "new" | "read" | "responded" | "archived"
): Promise<SchoolInquiry[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, schoolInquiriesCollection);
  const constraints: Parameters<typeof query>[1][] = [
    where("schoolId", "==", schoolId),
  ];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SchoolInquiry[];
}

/**
 * Get unread inquiry count for a school
 */
export async function getUnreadInquiryCount(schoolId: string): Promise<number> {
  const fbApp = checkFirebase();
  if (!fbApp) return 0;

  const colRef = collection(db!, schoolInquiriesCollection);
  const q = query(
    colRef,
    where("schoolId", "==", schoolId),
    where("status", "==", "new")
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Update inquiry status
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: "new" | "read" | "responded" | "archived",
  respondedBy?: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, schoolInquiriesCollection, inquiryId);
  const updateData: Record<string, unknown> = { status };

  if (status === "responded" && respondedBy) {
    updateData.respondedAt = serverTimestamp();
    updateData.respondedBy = respondedBy;
  }

  await updateDoc(docRef, updateData);
}

/**
 * List inquiries from a member
 */
export async function listMemberInquiries(
  memberId: string
): Promise<SchoolInquiry[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, schoolInquiriesCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SchoolInquiry[];
}

/**
 * Get schools pending review (admin)
 */
export async function getSchoolsPendingReview(): Promise<School[]> {
  return listSchools({
    status: "pending",
    publishedOnly: false,
  });
}

/**
 * Get featured schools
 */
export async function getFeaturedSchools(maxResults: number = 6): Promise<School[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, schoolsCollection);
  const q = query(
    colRef,
    where("isPublished", "==", true),
    where("status", "==", "active"),
    where("verification.isVerified", "==", true),
    orderBy("name", "asc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as School[];
}
