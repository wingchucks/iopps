// Education Program Firestore operations for the Education Pillar
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
  educationProgramsCollection,
  savedProgramsCollection,
  checkFirebase,
} from "./shared";
import type {
  EducationProgram,
  SavedProgram,
  ProgramCategory,
  ProgramLevel,
  ProgramDelivery,
} from "@/lib/types";

// ============================================
// PROGRAM CRUD OPERATIONS
// ============================================

type ProgramInput = Omit<EducationProgram, "id" | "createdAt" | "updatedAt" | "isPublished" | "viewsCount" | "savesCount"> & {
  isPublished?: boolean;
};

export async function createEducationProgram(input: ProgramInput): Promise<string> {
  const ref = collection(db!, educationProgramsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    isPublished: input.isPublished ?? false,
    viewsCount: 0,
    savesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Update the document with its own ID
  await updateDoc(doc(db!, educationProgramsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function getEducationProgram(id: string): Promise<EducationProgram | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = doc(firestore, educationProgramsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as EducationProgram;
  } catch {
    return null;
  }
}

export async function getEducationProgramBySlug(slug: string): Promise<EducationProgram | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;
    const ref = collection(firestore, educationProgramsCollection);
    const q = query(ref, where("slug", "==", slug), where("isPublished", "==", true), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as EducationProgram;
  } catch {
    return null;
  }
}

export async function updateEducationProgram(id: string, data: Partial<EducationProgram>): Promise<void> {
  const ref = doc(db!, educationProgramsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEducationProgram(id: string): Promise<void> {
  const ref = doc(db!, educationProgramsCollection, id);
  await deleteDoc(ref);
}

// ============================================
// PROGRAM LISTING OPERATIONS
// ============================================

export interface ListEducationProgramsOptions {
  schoolId?: string;
  category?: ProgramCategory | ProgramCategory[];
  level?: ProgramLevel | ProgramLevel[];
  deliveryMethod?: ProgramDelivery | ProgramDelivery[];
  province?: string;
  indigenousFocused?: boolean;
  publishedOnly?: boolean;
  limitCount?: number;
  search?: string;
}

export async function listEducationPrograms(options: ListEducationProgramsOptions = {}): Promise<EducationProgram[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, educationProgramsCollection);
    const constraints: any[] = [];

    if (options.publishedOnly !== false) {
      constraints.push(where("isPublished", "==", true));
    }

    if (options.schoolId) {
      constraints.push(where("schoolId", "==", options.schoolId));
    }

    // Single category filter
    if (options.category && typeof options.category === "string") {
      constraints.push(where("category", "==", options.category));
    }

    // Single level filter
    if (options.level && typeof options.level === "string") {
      constraints.push(where("level", "==", options.level));
    }

    // Single delivery filter
    if (options.deliveryMethod && typeof options.deliveryMethod === "string") {
      constraints.push(where("deliveryMethod", "==", options.deliveryMethod));
    }

    if (options.indigenousFocused !== undefined) {
      constraints.push(where("indigenousFocused", "==", options.indigenousFocused));
    }

    constraints.push(orderBy("name", "asc"));

    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    let programs = snap.docs.map((docSnap) => docSnap.data() as EducationProgram);

    // Client-side filtering for arrays (Firestore limitations)
    if (options.category && Array.isArray(options.category)) {
      programs = programs.filter((p) => options.category!.includes(p.category));
    }

    if (options.level && Array.isArray(options.level)) {
      programs = programs.filter((p) => (options.level as ProgramLevel[]).includes(p.level));
    }

    if (options.deliveryMethod && Array.isArray(options.deliveryMethod)) {
      programs = programs.filter((p) =>
        (options.deliveryMethod as ProgramDelivery[]).includes(p.deliveryMethod)
      );
    }

    // Client-side text search
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      programs = programs.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.schoolName?.toLowerCase().includes(searchLower)
      );
    }

    return programs;
  } catch {
    return [];
  }
}

export async function listSchoolPrograms(schoolId: string): Promise<EducationProgram[]> {
  return listEducationPrograms({ schoolId, publishedOnly: true });
}

export async function listSchoolProgramsForDashboard(schoolId: string): Promise<EducationProgram[]> {
  return listEducationPrograms({ schoolId, publishedOnly: false });
}

export async function listFeaturedPrograms(limitCount: number = 6): Promise<EducationProgram[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, educationProgramsCollection);
    const q = query(
      ref,
      where("isPublished", "==", true),
      orderBy("viewsCount", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as EducationProgram);
  } catch {
    return [];
  }
}

export async function listIndigenousFocusedPrograms(limitCount: number = 10): Promise<EducationProgram[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, educationProgramsCollection);
    const q = query(
      ref,
      where("isPublished", "==", true),
      where("indigenousFocused", "==", true),
      orderBy("name", "asc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as EducationProgram);
  } catch {
    return [];
  }
}

// ============================================
// BULK OPERATIONS (for imports)
// ============================================

export async function bulkCreatePrograms(
  schoolId: string,
  schoolName: string,
  programs: Omit<ProgramInput, "schoolId" | "schoolName">[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const program of programs) {
    const id = await createEducationProgram({
      ...program,
      schoolId,
      schoolName,
    });
    ids.push(id);
  }
  return ids;
}

// ============================================
// SAVED PROGRAMS (Members)
// ============================================

export async function saveProgram(memberId: string, programId: string): Promise<void> {
  const ref = collection(db!, savedProgramsCollection);
  await addDoc(ref, {
    memberId,
    programId,
    createdAt: serverTimestamp(),
  });

  // Increment saves count on the program
  try {
    const programRef = doc(db!, educationProgramsCollection, programId);
    const snap = await getDoc(programRef);
    if (snap.exists()) {
      const currentSaves = snap.data().savesCount || 0;
      await updateDoc(programRef, {
        savesCount: currentSaves + 1,
      });
    }
  } catch {
    // Silently fail
  }
}

export async function unsaveProgram(memberId: string, programId: string): Promise<void> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return;

    const ref = collection(firestore, savedProgramsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      where("programId", "==", programId)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // Decrement saves count on the program
    const programRef = doc(db!, educationProgramsCollection, programId);
    const programSnap = await getDoc(programRef);
    if (programSnap.exists()) {
      const currentSaves = programSnap.data().savesCount || 0;
      await updateDoc(programRef, {
        savesCount: Math.max(0, currentSaves - 1),
      });
    }
  } catch {
    // Silently fail
  }
}

export async function isProgramSaved(memberId: string, programId: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return false;

    const ref = collection(firestore, savedProgramsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      where("programId", "==", programId),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

export async function listSavedPrograms(memberId: string): Promise<SavedProgram[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, savedProgramsCollection);
    const q = query(
      ref,
      where("memberId", "==", memberId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as SavedProgram));
  } catch {
    return [];
  }
}

export async function listSavedProgramIds(memberId: string): Promise<string[]> {
  try {
    const saved = await listSavedPrograms(memberId);
    return saved.map((s) => s.programId);
  } catch {
    return [];
  }
}

// ============================================
// PROGRAM ANALYTICS
// ============================================

export async function incrementProgramViews(programId: string): Promise<void> {
  try {
    const ref = doc(db!, educationProgramsCollection, programId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentViews = snap.data().viewsCount || 0;
      await updateDoc(ref, {
        viewsCount: currentViews + 1,
      });
    }
  } catch {
    // Silently fail - analytics shouldn't break the page
  }
}

// ============================================
// PROGRAM COUNTS BY CATEGORY (for browse page)
// ============================================

export async function getProgramCountsByCategory(): Promise<Record<ProgramCategory, number>> {
  try {
    const programs = await listEducationPrograms({ publishedOnly: true });
    const counts: Record<string, number> = {};
    for (const program of programs) {
      counts[program.category] = (counts[program.category] || 0) + 1;
    }
    return counts as Record<ProgramCategory, number>;
  } catch {
    return {} as Record<ProgramCategory, number>;
  }
}
