// School-related Firestore operations for the Education Pillar
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
  db,
  schoolsCollection,
  studentInquiriesCollection,
  savedSchoolsCollection,
  checkFirebase,
} from "./shared";
import type {
  School,
  StudentInquiry,
  SavedSchool,
} from "@/lib/types";

// ============================================
// SCHOOL CRUD OPERATIONS
// ============================================

type SchoolInput = Omit<School, "id" | "createdAt" | "updatedAt" | "isPublished"> & {
  isPublished?: boolean;
};

export async function createSchool(input: SchoolInput): Promise<string> {
  const ref = collection(db!, schoolsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    isPublished: input.isPublished ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Update the document with its own ID
  await updateDoc(doc(db!, schoolsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function getSchool(id: string): Promise<School | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = doc(firestore, schoolsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as School;
  } catch {
    return null;
  }
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = collection(firestore, schoolsCollection);
    const q = query(ref, where("slug", "==", slug), where("isPublished", "==", true), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as School;
  } catch {
    return null;
  }
}

export async function getSchoolByEmployerId(employerId: string): Promise<School | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = collection(firestore, schoolsCollection);
    const q = query(ref, where("employerId", "==", employerId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as School;
  } catch {
    return null;
  }
}

export async function updateSchool(id: string, data: Partial<School>): Promise<void> {
  const ref = doc(db!, schoolsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSchool(id: string): Promise<void> {
  const ref = doc(db!, schoolsCollection, id);
  await deleteDoc(ref);
}

// ============================================
// SCHOOL LISTING OPERATIONS
// ============================================

export interface ListSchoolsOptions {
  type?: string;
  province?: string;
  indigenousControlled?: boolean;
  publishedOnly?: boolean;
  limitCount?: number;
}

export async function listSchools(options: ListSchoolsOptions = {}): Promise<School[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, schoolsCollection);
    const constraints: any[] = [];

    if (options.publishedOnly !== false) {
      constraints.push(where("isPublished", "==", true));
    }

    if (options.type) {
      constraints.push(where("type", "==", options.type));
    }

    if (options.province) {
      constraints.push(where("headOffice.province", "==", options.province));
    }

    if (options.indigenousControlled !== undefined) {
      constraints.push(where("verification.indigenousControlled", "==", options.indigenousControlled));
    }

    constraints.push(orderBy("name", "asc"));

    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as School);
  } catch {
    return [];
  }
}

export async function listFeaturedSchools(limitCount: number = 4): Promise<School[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, schoolsCollection);
    const q = query(
      ref,
      where("isPublished", "==", true),
      where("verification.isVerified", "==", true),
      orderBy("stats.indigenousStudentPercentage", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as School);
  } catch {
    return [];
  }
}

// ============================================
// STUDENT INQUIRIES
// ============================================

type StudentInquiryInput = Omit<StudentInquiry, "id" | "createdAt" | "updatedAt" | "status">;

export async function createStudentInquiry(input: StudentInquiryInput): Promise<string> {
  const ref = collection(db!, studentInquiriesCollection);
  const docRef = await addDoc(ref, {
    ...input,
    status: "new",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listSchoolInquiries(schoolId: string): Promise<StudentInquiry[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, studentInquiriesCollection);
    const q = query(
      ref,
      where("schoolId", "==", schoolId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as StudentInquiry));
  } catch {
    return [];
  }
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: StudentInquiry["status"]
): Promise<void> {
  const ref = doc(db!, studentInquiriesCollection, inquiryId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
    ...(status === "replied" ? { repliedAt: serverTimestamp() } : {}),
  });
}

export async function getUnreadInquiryCount(schoolId: string): Promise<number> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return 0;

    const ref = collection(firestore, studentInquiriesCollection);
    const q = query(
      ref,
      where("schoolId", "==", schoolId),
      where("status", "==", "new")
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

// ============================================
// SAVED SCHOOLS (Members)
// ============================================

export async function saveSchool(memberId: string, schoolId: string): Promise<void> {
  const ref = collection(db!, savedSchoolsCollection);
  await addDoc(ref, {
    memberId,
    schoolId,
    createdAt: serverTimestamp(),
  });
}

export async function unsaveSchool(memberId: string, schoolId: string): Promise<void> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return;

    const ref = collection(firestore, savedSchoolsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch {
    // Silently fail
  }
}

export async function isSchoolSaved(memberId: string, schoolId: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return false;

    const ref = collection(firestore, savedSchoolsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      where("schoolId", "==", schoolId),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

export async function listSavedSchools(memberId: string): Promise<SavedSchool[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, savedSchoolsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as SavedSchool));
  } catch {
    return [];
  }
}

export async function listSavedSchoolIds(memberId: string): Promise<string[]> {
  try {
    const saved = await listSavedSchools(memberId);
    return saved.map((s) => s.schoolId);
  } catch {
    return [];
  }
}

// ============================================
// SCHOOL ANALYTICS
// ============================================

export async function incrementSchoolViews(schoolId: string): Promise<void> {
  try {
    const ref = doc(db!, schoolsCollection, schoolId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentViews = snap.data().stats?.viewsCount || 0;
      await updateDoc(ref, {
        "stats.viewsCount": currentViews + 1,
      });
    }
  } catch {
    // Silently fail - analytics shouldn't break the page
  }
}

// ============================================
// ALIASES (for backward compatibility)
// ============================================

// Alias for getSchoolByEmployerId (some files use organizationId terminology)
export const getSchoolByOrganizationId = getSchoolByEmployerId;

// Alias for createStudentInquiry (some files use createSchoolInquiry)
export const createSchoolInquiry = createStudentInquiry;
