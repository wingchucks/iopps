// Training program Firestore operations
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
  trainingProgramsCollection,
  memberLearningCollection,
  savedTrainingCollection,
} from "./shared";
import type {
  TrainingProgram,
  TrainingProgramStatus,
  MemberTrainingInterest,
  SavedTraining,
} from "@/lib/types";
import { toDate } from "./timestamps";

// Check if a training program has ended (respects 'ongoing' flag)
export function isTrainingProgramExpired(program: TrainingProgram): boolean {
  // Ongoing programs never expire based on end date
  if (program.ongoing) return false;

  const now = new Date();
  const endDate = toDate(program.endDate);
  if (endDate && endDate < now) return true;

  return false;
}

// ============================================
// TRAINING PROGRAMS
// ============================================

export interface ListTrainingProgramsOptions {
  organizationId?: string;
  status?: TrainingProgramStatus;
  activeOnly?: boolean;
  featured?: boolean;
  category?: string;
  format?: string;
  maxResults?: number;
}

/**
 * List training programs with filters
 */
export async function listTrainingPrograms(
  options: ListTrainingProgramsOptions = {}
): Promise<TrainingProgram[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, trainingProgramsCollection);
  const constraints: Parameters<typeof query>[1][] = [];

  if (options.organizationId) {
    constraints.push(where("organizationId", "==", options.organizationId));
  }

  if (options.status) {
    constraints.push(where("status", "==", options.status));
  }

  // Default: only show approved and active programs
  if (options.activeOnly !== false && !options.organizationId) {
    constraints.push(where("active", "==", true));
    constraints.push(where("status", "==", "approved"));
  }

  if (options.featured) {
    constraints.push(where("featured", "==", true));
  }

  if (options.category) {
    constraints.push(where("category", "==", options.category));
  }

  if (options.format) {
    constraints.push(where("format", "==", options.format));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  let programs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TrainingProgram[];

  // Client-side filtering for expired programs (safety net)
  // Only filter out expired programs when not viewing organization-specific listings
  if (options.activeOnly !== false && !options.organizationId) {
    programs = programs.filter(p => !isTrainingProgramExpired(p));
  }

  return programs;
}

/**
 * Get a single training program by ID
 */
export async function getTrainingProgram(
  programId: string
): Promise<TrainingProgram | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const docRef = doc(db!, trainingProgramsCollection, programId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as TrainingProgram;
}

/**
 * Create a new training program
 * Uses hybrid approval: verified orgs auto-approve, others go to pending
 */
export async function createTrainingProgram(
  data: Omit<
    TrainingProgram,
    "id" | "createdAt" | "updatedAt" | "viewCount" | "clickCount"
  >,
  isVerifiedOrganization: boolean
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const colRef = collection(db!, trainingProgramsCollection);

  // Hybrid approval: verified orgs can auto-approve
  const status: TrainingProgramStatus = isVerifiedOrganization
    ? "approved"
    : "pending";

  const docRef = await addDoc(colRef, {
    ...data,
    status,
    featured: false, // Featured must be purchased
    active: true,
    viewCount: 0,
    clickCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a training program
 */
export async function updateTrainingProgram(
  programId: string,
  data: Partial<
    Omit<TrainingProgram, "id" | "createdAt" | "status" | "featured">
  >
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, trainingProgramsCollection, programId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update training program status (admin only)
 */
export async function updateTrainingProgramStatus(
  programId: string,
  status: TrainingProgramStatus,
  approvedBy?: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, trainingProgramsCollection, programId);
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
 * Toggle featured status for a training program (admin only)
 */
export async function setTrainingProgramFeatured(
  programId: string,
  featured: boolean
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, trainingProgramsCollection, programId);
  await updateDoc(docRef, {
    featured,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a training program
 */
export async function deleteTrainingProgram(programId: string): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  const docRef = doc(db!, trainingProgramsCollection, programId);
  await deleteDoc(docRef);
}

/**
 * Increment view count for a training program
 */
export async function incrementTrainingProgramViews(
  programId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const docRef = doc(db!, trainingProgramsCollection, programId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      viewCount: (snapshot.data().viewCount || 0) + 1,
    });
  }
}

// ============================================
// MEMBER TRAINING INTERESTS (Analytics)
// ============================================

/**
 * Track enrollment click (when user clicks to external provider)
 */
export async function trackEnrollmentClick(
  userId: string,
  programId: string,
  programTitle: string,
  organizationName: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  // Increment click count on program
  const programRef = doc(db!, trainingProgramsCollection, programId);
  const programSnap = await getDoc(programRef);
  if (programSnap.exists()) {
    await updateDoc(programRef, {
      clickCount: (programSnap.data().clickCount || 0) + 1,
    });
  }

  // Record in member_learning collection
  const colRef = collection(db!, memberLearningCollection);
  await addDoc(colRef, {
    userId,
    programId,
    programTitle,
    organizationName,
    clickedAt: serverTimestamp(),
    enrollmentClicked: true,
  });
}

/**
 * Get member's training interests/history
 */
export async function getMemberTrainingInterests(
  userId: string
): Promise<MemberTrainingInterest[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, memberLearningCollection);
  const q = query(
    colRef,
    where("userId", "==", userId),
    orderBy("clickedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MemberTrainingInterest[];
}

/**
 * List training programs for an organization (includes pending)
 */
export async function listOrganizationTrainingPrograms(
  organizationId: string
): Promise<TrainingProgram[]> {
  return listTrainingPrograms({
    organizationId,
    activeOnly: false,
  });
}

/**
 * Get training programs pending review (admin)
 */
export async function getTrainingProgramsPendingReview(): Promise<
  TrainingProgram[]
> {
  return listTrainingPrograms({
    status: "pending",
    activeOnly: false,
  });
}

// ============================================
// SAVED TRAINING PROGRAMS (Member bookmarks)
// ============================================

/**
 * Save a training program for a member
 */
export async function saveTrainingProgram(
  memberId: string,
  programId: string
): Promise<string> {
  const fbApp = checkFirebase();
  if (!fbApp) throw new Error("Firebase not initialized");

  // Check if already saved
  const existing = await getSavedTraining(memberId, programId);
  if (existing) return existing.id;

  const colRef = collection(db!, savedTrainingCollection);
  const docRef = await addDoc(colRef, {
    memberId,
    programId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Remove a saved training program
 */
export async function unsaveTrainingProgram(
  memberId: string,
  programId: string
): Promise<void> {
  const fbApp = checkFirebase();
  if (!fbApp) return;

  const existing = await getSavedTraining(memberId, programId);
  if (existing) {
    const docRef = doc(db!, savedTrainingCollection, existing.id);
    await deleteDoc(docRef);
  }
}

/**
 * Check if a training program is saved
 */
export async function getSavedTraining(
  memberId: string,
  programId: string
): Promise<SavedTraining | null> {
  const fbApp = checkFirebase();
  if (!fbApp) return null;

  const colRef = collection(db!, savedTrainingCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    where("programId", "==", programId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as SavedTraining;
}

/**
 * Check if a training program is saved (boolean)
 */
export async function isTrainingSaved(
  memberId: string,
  programId: string
): Promise<boolean> {
  const saved = await getSavedTraining(memberId, programId);
  return saved !== null;
}

/**
 * List all saved training programs for a member
 */
export async function listSavedTraining(
  memberId: string
): Promise<SavedTraining[]> {
  const fbApp = checkFirebase();
  if (!fbApp) return [];

  const colRef = collection(db!, savedTrainingCollection);
  const q = query(
    colRef,
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const savedItems = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as SavedTraining[];

  // Fetch training program details
  const programPromises = savedItems.map(async (item) => {
    const program = await getTrainingProgram(item.programId);
    return { ...item, program };
  });

  return Promise.all(programPromises);
}
export function getSavedTrainingQuery(memberId: string) {
  return query(
    collection(db!, savedTrainingCollection),
    where("memberId", "==", memberId)
  );
}
