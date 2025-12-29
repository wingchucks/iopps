// Scholarship-related Firestore operations
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
  scholarshipsCollection,
  scholarshipApplicationsCollection,
  savedScholarshipsCollection,
  checkFirebase,
} from "./shared";
import type {
  Scholarship,
  ScholarshipApplication,
  ApplicationStatus,
  ExtendedScholarship,
  SavedScholarship,
  ProgramLevel,
} from "@/lib/types";
import { MOCK_SCHOLARSHIPS } from "../mockData";

type ScholarshipInput = Omit<
  Scholarship,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createScholarship(
  input: ScholarshipInput
): Promise<string> {
  const ref = collection(db!, scholarshipsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, scholarshipsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listScholarships(): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_SCHOLARSHIPS;
    }
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as Scholarship);
  } catch {
    return [];
  }
}

export async function updateScholarship(
  id: string,
  data: Partial<Scholarship>
) {
  const ref = doc(db!, scholarshipsCollection, id);
  await updateDoc(ref, data);
}

export async function listEmployerScholarships(employerId: string): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(ref, where("employerId", "==", employerId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Scholarship));
  } catch {
    return [];
  }
}

export async function deleteScholarship(id: string): Promise<void> {
  const ref = doc(db!, scholarshipsCollection, id);
  await deleteDoc(ref);
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_SCHOLARSHIPS.find(s => s.id === id) || null;
    }
    const ref = doc(firestore, scholarshipsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Scholarship;
  } catch {
    return null;
  }
}

// Scholarship Applications
type ScholarshipApplicationInput = {
  scholarshipId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  education?: string;
  essay?: string;
};

export async function createScholarshipApplication(
  input: ScholarshipApplicationInput
): Promise<string> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    status: "submitted" as ApplicationStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listMemberScholarshipApplications(
  memberId: string
): Promise<ScholarshipApplication[]> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const q = query(
    ref,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as ScholarshipApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function listScholarshipApplicantsForEmployer(
  employerId: string,
  scholarshipId?: string
): Promise<ScholarshipApplication[]> {
  const ref = collection(db!, scholarshipApplicationsCollection);
  const constraints: any[] = [where("employerId", "==", employerId)];
  if (scholarshipId) {
    constraints.push(where("scholarshipId", "==", scholarshipId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as ScholarshipApplication;
    return { ...data, id: docSnapshot.id };
  });
}

export async function updateScholarshipApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const ref = doc(db!, scholarshipApplicationsCollection, applicationId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function withdrawScholarshipApplication(applicationId: string) {
  const ref = doc(db!, scholarshipApplicationsCollection, applicationId);
  await updateDoc(ref, {
    status: "withdrawn" as ApplicationStatus,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// EXTENDED SCHOLARSHIP FUNCTIONS (Education Pillar)
// ============================================

export interface ListScholarshipsOptions {
  schoolId?: string;
  employerId?: string;
  providerType?: "school" | "government" | "organization" | "private";
  studyLevel?: ProgramLevel;
  fieldOfStudy?: string;
  province?: string;
  minAmount?: number;
  maxAmount?: number;
  deadlineAfter?: Date;
  deadlineBefore?: Date;
  activeOnly?: boolean;
  featured?: boolean;
  maxResults?: number;
}

/**
 * List scholarships with advanced filters (Education pillar)
 */
export async function listScholarshipsFiltered(
  options: ListScholarshipsOptions = {}
): Promise<ExtendedScholarship[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, scholarshipsCollection);
  const constraints: Parameters<typeof query>[1][] = [];

  if (options.schoolId) {
    constraints.push(where("schoolId", "==", options.schoolId));
  }

  if (options.employerId) {
    constraints.push(where("employerId", "==", options.employerId));
  }

  if (options.providerType) {
    constraints.push(where("providerType", "==", options.providerType));
  }

  if (options.activeOnly !== false) {
    constraints.push(where("active", "==", true));
  }

  if (options.featured) {
    constraints.push(where("featured", "==", true));
  }

  constraints.push(orderBy("deadline", "asc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  let scholarships = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ExtendedScholarship[];

  // Client-side filtering for complex criteria
  if (options.studyLevel) {
    scholarships = scholarships.filter(
      (s) => s.eligibility?.studyLevel?.includes(options.studyLevel!) ?? true
    );
  }

  if (options.fieldOfStudy) {
    scholarships = scholarships.filter(
      (s) =>
        s.eligibility?.fieldsOfStudy?.some((f) =>
          f.toLowerCase().includes(options.fieldOfStudy!.toLowerCase())
        ) ?? true
    );
  }

  if (options.province) {
    scholarships = scholarships.filter(
      (s) => s.eligibility?.provinces?.includes(options.province!) ?? true
    );
  }

  if (options.minAmount !== undefined) {
    scholarships = scholarships.filter(
      (s) => (s.amountStructured?.value ?? 0) >= options.minAmount!
    );
  }

  if (options.maxAmount !== undefined) {
    scholarships = scholarships.filter(
      (s) => (s.amountStructured?.value ?? Infinity) <= options.maxAmount!
    );
  }

  if (options.deadlineAfter) {
    scholarships = scholarships.filter((s) => {
      if (!s.deadline) return true;
      const deadline =
        typeof s.deadline === "string"
          ? new Date(s.deadline)
          : s.deadline.toDate();
      return deadline >= options.deadlineAfter!;
    });
  }

  if (options.deadlineBefore) {
    scholarships = scholarships.filter((s) => {
      if (!s.deadline) return true;
      const deadline =
        typeof s.deadline === "string"
          ? new Date(s.deadline)
          : s.deadline.toDate();
      return deadline <= options.deadlineBefore!;
    });
  }

  return scholarships;
}

/**
 * List scholarships by school
 */
export async function listSchoolScholarships(
  schoolId: string
): Promise<ExtendedScholarship[]> {
  return listScholarshipsFiltered({ schoolId });
}

/**
 * Get upcoming scholarship deadlines
 */
export async function getUpcomingScholarshipDeadlines(
  days: number = 30
): Promise<ExtendedScholarship[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return listScholarshipsFiltered({
    deadlineAfter: now,
    deadlineBefore: future,
  });
}

/**
 * Get scholarships for a specific program level
 */
export async function getScholarshipsForLevel(
  level: ProgramLevel,
  maxResults?: number
): Promise<ExtendedScholarship[]> {
  return listScholarshipsFiltered({
    studyLevel: level,
    maxResults,
  });
}

/**
 * Get featured scholarships
 */
export async function getFeaturedScholarships(
  maxResults: number = 6
): Promise<ExtendedScholarship[]> {
  return listScholarshipsFiltered({
    featured: true,
    maxResults,
  });
}

/**
 * Create an extended scholarship with all education pillar fields
 */
export async function createExtendedScholarship(
  data: Omit<ExtendedScholarship, "id" | "createdAt">
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, scholarshipsCollection);
  const docRef = await addDoc(colRef, {
    ...data,
    active: data.active ?? true,
    viewCount: 0,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db!, scholarshipsCollection, docRef.id), {
    id: docRef.id,
  });

  return docRef.id;
}

/**
 * Increment view count for a scholarship
 */
export async function incrementScholarshipViews(
  scholarshipId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, scholarshipsCollection, scholarshipId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      viewCount: (snapshot.data().viewCount || 0) + 1,
    });
  }
}

/**
 * Get scholarship by slug
 */
export async function getScholarshipBySlug(
  slug: string
): Promise<ExtendedScholarship | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, scholarshipsCollection);
  const q = query(
    colRef,
    where("slug", "==", slug),
    where("active", "==", true),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as ExtendedScholarship;
}

// ============================================
// SAVED SCHOLARSHIPS (Member bookmarks)
// ============================================

/**
 * Save a scholarship for a member
 */
export async function saveScholarship(
  memberId: string,
  scholarshipId: string
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  // Check if already saved
  const existing = await getSavedScholarshipRecord(memberId, scholarshipId);
  if (existing) return existing.id;

  const colRef = collection(db!, savedScholarshipsCollection);
  const docRef = await addDoc(colRef, {
    memberId,
    scholarshipId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Remove a saved scholarship
 */
export async function unsaveScholarship(
  memberId: string,
  scholarshipId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const existing = await getSavedScholarshipRecord(memberId, scholarshipId);
  if (existing) {
    const docRef = doc(db!, savedScholarshipsCollection, existing.id);
    await deleteDoc(docRef);
  }
}

/**
 * Get a saved scholarship record
 */
export async function getSavedScholarshipRecord(
  memberId: string,
  scholarshipId: string
): Promise<SavedScholarship | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, savedScholarshipsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    where("scholarshipId", "==", scholarshipId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as SavedScholarship;
}

/**
 * Check if a scholarship is saved
 */
export async function isScholarshipSaved(
  memberId: string,
  scholarshipId: string
): Promise<boolean> {
  const saved = await getSavedScholarshipRecord(memberId, scholarshipId);
  return saved !== null;
}

/**
 * List all saved scholarships for a member
 */
export async function listSavedScholarships(
  memberId: string
): Promise<SavedScholarship[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, savedScholarshipsCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const savedItems = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SavedScholarship[];

  // Fetch scholarship details
  const scholarshipPromises = savedItems.map(async (item) => {
    const scholarship = await getScholarship(item.scholarshipId);
    return { ...item, scholarship: scholarship as ExtendedScholarship | null };
  });

  return Promise.all(scholarshipPromises);
}
