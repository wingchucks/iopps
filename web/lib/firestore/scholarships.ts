// Scholarship-related Firestore operations
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
  db,
  scholarshipsCollection,
  scholarshipApplicationsCollection,
  documentId,
  checkFirebase,
} from "./shared";
import type { QueryConstraint } from "./shared";
import type { Scholarship, ScholarshipApplication, ApplicationStatus } from "@/lib/types";
import { MOCK_SCHOLARSHIPS } from "../mockData";
import { toDate } from "./timestamps";

// Check if a scholarship deadline has passed
export function isScholarshipExpired(scholarship: Scholarship): boolean {
  const now = new Date();
  const deadline = toDate(scholarship.deadline);
  if (deadline && deadline < now) return true;
  return false;
}

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

export async function listScholarships(options: { includeExpired?: boolean } = {}): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      let scholarships = [...MOCK_SCHOLARSHIPS];
      if (!options.includeExpired) {
        scholarships = scholarships.filter(s => s.active !== false && !isScholarshipExpired(s));
      }
      return scholarships;
    }
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(ref, where("active", "==", true), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    let scholarships = snap.docs.map((docSnap) => docSnap.data() as Scholarship);

    // Client-side filtering for expired scholarships (safety net)
    if (!options.includeExpired) {
      scholarships = scholarships.filter(s => !isScholarshipExpired(s));
    }

    return scholarships;
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
  const constraints: QueryConstraint[] = [where("employerId", "==", employerId)];
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
// SCHOOL-LINKED SCHOLARSHIPS (Education Pillar)
// ============================================

export async function listSchoolScholarships(schoolId: string): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];
    const ref = collection(firestore, scholarshipsCollection);
    // Query for scholarships that have schoolId field matching
    const q = query(
      ref,
      where("schoolId", "==", schoolId),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Scholarship));
  } catch {
    return [];
  }
}

export async function listUpcomingDeadlineScholarships(daysAhead: number = 30): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    // Get all active scholarships and filter client-side for deadline
    const ref = collection(firestore, scholarshipsCollection);
    const q = query(
      ref,
      where("active", "==", true),
      orderBy("deadline", "asc")
    );
    const snap = await getDocs(q);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Scholarship))
      .filter((s) => {
        const deadline = typeof s.deadline === 'string'
          ? new Date(s.deadline)
          : (s.deadline && typeof s.deadline === 'object' && 'toDate' in s.deadline)
            ? (s.deadline as any).toDate()
            : s.deadline instanceof Date ? s.deadline : new Date(s.deadline as any);
        return deadline >= now && deadline <= futureDate;
      });
  } catch {
    return [];
  }
}

export async function listScholarshipsForProgram(programId: string): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];
    const ref = collection(firestore, scholarshipsCollection);
    // Query for scholarships that include this program in their eligibility
    const q = query(
      ref,
      where("eligibility.programIds", "array-contains", programId),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Scholarship));
  } catch {
    return [];
  }
}

// Extended scholarship type that includes Education pillar fields
export type ExtendedScholarshipInput = Omit<
  Scholarship,
  "id" | "createdAt" | "active"
> & {
  active?: boolean;
  schoolId?: string;
  providerType?: "school" | "government" | "organization" | "private";
  eligibility?: {
    indigenousStatus?: string[];
    nations?: string[];
    provinces?: string[];
    studyLevel?: string[];
    fieldsOfStudy?: string[];
    programIds?: string[];
    schoolIds?: string[];
    gpaRequirement?: number;
    financialNeed?: boolean;
    otherRequirements?: string[];
  };
  amountStructured?: {
    value: number;
    type: "fixed" | "range" | "variable" | "full_tuition";
    maxValue?: number;
    currency?: string;
  };
  applicationOpen?: Date | null;
  isRecurring?: boolean;
  applicationProcess?: string;
  sourceUrl?: string;
  communityStats?: {
    recipientsCount?: number;
    connectionsReceived?: number;
  };
};

export async function createExtendedScholarship(
  input: ExtendedScholarshipInput
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
// Batch fetch scholarships by IDs
export async function getScholarshipsByIds(ids: string[]): Promise<Scholarship[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore || ids.length === 0) return [];

    const scholarships: Scholarship[] = [];
    const chunks = [];

    // Firestore 'in' query supports max 10 to 30 items. Batching by 10.
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }

    const ref = collection(firestore, scholarshipsCollection);

    for (const chunk of chunks) {
      if (chunk.length > 0) {
        const q = query(ref, where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          scholarships.push({ id: d.id, ...d.data() } as Scholarship);
        });
      }
    }

    return scholarships;
  } catch (error) {
    console.error("Error fetching scholarships by IDs:", error);
    return [];
  }
}
