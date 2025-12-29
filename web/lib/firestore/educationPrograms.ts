// Education Program Firestore operations
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
  educationProgramsCollection,
  savedProgramsCollection,
} from "./shared";
import type {
  EducationProgram,
  ProgramStatus,
  ProgramLevel,
  ProgramDeliveryMethod,
  ProgramCategory,
  SavedProgram,
} from "@/lib/types";

// ============================================
// EDUCATION PROGRAMS
// ============================================

export interface ListEducationProgramsOptions {
  schoolId?: string;
  category?: ProgramCategory | string;
  level?: ProgramLevel;
  deliveryMethod?: ProgramDeliveryMethod;
  province?: string;
  indigenousFocused?: boolean;
  status?: ProgramStatus;
  publishedOnly?: boolean;
  featured?: boolean;
  maxResults?: number;
  search?: string;
}

/**
 * List education programs with filters
 */
export async function listEducationPrograms(
  options: ListEducationProgramsOptions = {}
): Promise<EducationProgram[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, educationProgramsCollection);
  const constraints: Parameters<typeof query>[1][] = [];

  if (options.schoolId) {
    constraints.push(where("schoolId", "==", options.schoolId));
  }

  if (options.category) {
    constraints.push(where("category", "==", options.category));
  }

  if (options.level) {
    constraints.push(where("level", "==", options.level));
  }

  if (options.deliveryMethod) {
    constraints.push(where("deliveryMethod", "==", options.deliveryMethod));
  }

  if (options.indigenousFocused !== undefined) {
    constraints.push(where("indigenousFocused", "==", options.indigenousFocused));
  }

  if (options.status) {
    constraints.push(where("status", "==", options.status));
  }

  // Default: only show published and approved programs for public listings
  if (options.publishedOnly !== false && !options.schoolId) {
    constraints.push(where("isPublished", "==", true));
    constraints.push(where("status", "==", "approved"));
  }

  if (options.featured) {
    constraints.push(where("featured", "==", true));
  }

  constraints.push(orderBy("name", "asc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  let programs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EducationProgram[];

  // Client-side text search if specified
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    programs = programs.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
    );
  }

  return programs;
}

/**
 * Get a single education program by ID
 */
export async function getEducationProgram(
  programId: string
): Promise<EducationProgram | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const docRef = doc(db!, educationProgramsCollection, programId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as EducationProgram;
}

/**
 * Get an education program by slug
 */
export async function getEducationProgramBySlug(
  slug: string
): Promise<EducationProgram | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, educationProgramsCollection);
  const q = query(
    colRef,
    where("slug", "==", slug),
    where("isPublished", "==", true),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as EducationProgram;
}

/**
 * List programs for a school (includes drafts)
 */
export async function listSchoolPrograms(
  schoolId: string
): Promise<EducationProgram[]> {
  return listEducationPrograms({
    schoolId,
    publishedOnly: false,
  });
}

/**
 * Create a new education program
 */
export async function createEducationProgram(
  data: Omit<
    EducationProgram,
    "id" | "createdAt" | "updatedAt" | "viewCount" | "inquiryCount"
  >
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, educationProgramsCollection);

  const docRef = await addDoc(colRef, {
    ...data,
    viewCount: 0,
    inquiryCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Bulk create education programs (for import)
 */
export async function bulkCreateEducationPrograms(
  programs: Omit<
    EducationProgram,
    "id" | "createdAt" | "updatedAt" | "viewCount" | "inquiryCount"
  >[]
): Promise<string[]> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, educationProgramsCollection);
  const ids: string[] = [];

  for (const data of programs) {
    const docRef = await addDoc(colRef, {
      ...data,
      viewCount: 0,
      inquiryCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ids.push(docRef.id);
  }

  return ids;
}

/**
 * Update an education program
 */
export async function updateEducationProgram(
  programId: string,
  data: Partial<Omit<EducationProgram, "id" | "createdAt">>
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationProgramsCollection, programId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update program status (admin/school admin)
 */
export async function updateEducationProgramStatus(
  programId: string,
  status: ProgramStatus,
  approvedBy?: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationProgramsCollection, programId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "approved" && approvedBy) {
    updateData.approvedAt = serverTimestamp();
    updateData.approvedBy = approvedBy;
  }

  await updateDoc(docRef, updateData);
}

/**
 * Publish or unpublish a program
 */
export async function setEducationProgramPublished(
  programId: string,
  isPublished: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationProgramsCollection, programId);
  await updateDoc(docRef, {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Set featured status for a program
 */
export async function setEducationProgramFeatured(
  programId: string,
  featured: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationProgramsCollection, programId);
  await updateDoc(docRef, {
    featured,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an education program
 */
export async function deleteEducationProgram(programId: string): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, educationProgramsCollection, programId);
  await deleteDoc(docRef);
}

/**
 * Increment view count for a program
 */
export async function incrementEducationProgramViews(
  programId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, educationProgramsCollection, programId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      viewCount: (snapshot.data().viewCount || 0) + 1,
    });
  }
}

/**
 * Increment inquiry count for a program
 */
export async function incrementEducationProgramInquiries(
  programId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, educationProgramsCollection, programId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      inquiryCount: (snapshot.data().inquiryCount || 0) + 1,
    });
  }
}

/**
 * Get programs pending review (admin)
 */
export async function getEducationProgramsPendingReview(): Promise<
  EducationProgram[]
> {
  return listEducationPrograms({
    status: "pending",
    publishedOnly: false,
  });
}

/**
 * Get featured programs
 */
export async function getFeaturedEducationPrograms(
  maxResults: number = 6
): Promise<EducationProgram[]> {
  return listEducationPrograms({
    featured: true,
    maxResults,
  });
}

/**
 * Get programs by category
 */
export async function getEducationProgramsByCategory(
  category: ProgramCategory | string,
  maxResults?: number
): Promise<EducationProgram[]> {
  return listEducationPrograms({
    category,
    maxResults,
  });
}

/**
 * Get programs by level
 */
export async function getEducationProgramsByLevel(
  level: ProgramLevel,
  maxResults?: number
): Promise<EducationProgram[]> {
  return listEducationPrograms({
    level,
    maxResults,
  });
}

// ============================================
// SAVED PROGRAMS (Member bookmarks)
// ============================================

/**
 * Save a program for a member
 */
export async function saveEducationProgram(
  memberId: string,
  programId: string
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  // Check if already saved
  const existing = await getSavedProgram(memberId, programId);
  if (existing) return existing.id;

  const colRef = collection(db!, savedProgramsCollection);
  const docRef = await addDoc(colRef, {
    memberId,
    programId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Remove a saved program
 */
export async function unsaveEducationProgram(
  memberId: string,
  programId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const existing = await getSavedProgram(memberId, programId);
  if (existing) {
    const docRef = doc(db!, savedProgramsCollection, existing.id);
    await deleteDoc(docRef);
  }
}

/**
 * Get a saved program record
 */
export async function getSavedProgram(
  memberId: string,
  programId: string
): Promise<SavedProgram | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, savedProgramsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    where("programId", "==", programId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as SavedProgram;
}

/**
 * Check if a program is saved
 */
export async function isEducationProgramSaved(
  memberId: string,
  programId: string
): Promise<boolean> {
  const saved = await getSavedProgram(memberId, programId);
  return saved !== null;
}

/**
 * List all saved programs for a member
 */
export async function listSavedPrograms(
  memberId: string
): Promise<SavedProgram[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, savedProgramsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const savedItems = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SavedProgram[];

  // Fetch program details
  const programPromises = savedItems.map(async (item) => {
    const program = await getEducationProgram(item.programId);
    return { ...item, program };
  });

  return Promise.all(programPromises);
}

/**
 * Get program count for a school
 */
export async function getSchoolProgramCount(schoolId: string): Promise<number> {
  const fbApp = checkFirebase();
  if (!fbApp) return 0;

  const colRef = collection(db!, educationProgramsCollection);
  const q = query(
    colRef,
    where("schoolId", "==", schoolId),
    where("isPublished", "==", true),
    where("status", "==", "approved")
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
