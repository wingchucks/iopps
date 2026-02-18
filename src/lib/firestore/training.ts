import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface TrainingProgram {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  format: "online" | "in-person" | "hybrid";
  instructor: {
    name: string;
    title: string;
    bio: string;
    avatar: string;
  };
  duration: string;
  modules: { title: string; description: string; duration: string }[];
  enrollmentCount: number;
  maxEnrollment: number | null;
  prerequisites: string[];
  skills: string[];
  certificateOffered: boolean;
  orgId: string;
  orgName: string;
  location: string;
  startDate: string;
  endDate: string;
  price: number | null;
  featured: boolean;
  active: boolean;
  createdAt: unknown;
}

export interface TrainingEnrollment {
  id: string;
  userId: string;
  programId: string;
  programTitle: string;
  progress: number;
  completedModules: string[];
  totalModules: number;
  status: "enrolled" | "in-progress" | "completed" | "dropped";
  enrolledAt: unknown;
  completedAt: unknown;
  certificateUrl: string | null;
}

const programsCol = collection(db, "training_programs");
const enrollmentsCol = collection(db, "training_enrollments");

export async function getTrainingPrograms(filters?: {
  category?: string;
  format?: string;
}): Promise<TrainingProgram[]> {
  const constraints: QueryConstraint[] = [];

  if (filters?.category) {
    constraints.push(where("category", "==", filters.category));
  }
  if (filters?.format) {
    constraints.push(where("format", "==", filters.format));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(query(programsCol, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrainingProgram);
}

export async function getTrainingBySlug(
  slug: string
): Promise<TrainingProgram | null> {
  const snap = await getDocs(
    query(programsCol, where("slug", "==", slug))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as TrainingProgram;
}

export async function enrollInProgram(
  userId: string,
  program: TrainingProgram
): Promise<string> {
  const ref = await addDoc(enrollmentsCol, {
    userId,
    programId: program.id,
    programTitle: program.title,
    progress: 0,
    completedModules: [],
    totalModules: (program.modules || []).length,
    status: "enrolled",
    enrolledAt: serverTimestamp(),
    completedAt: null,
    certificateUrl: null,
  });
  return ref.id;
}

export async function getUserEnrollments(
  userId: string
): Promise<TrainingEnrollment[]> {
  const snap = await getDocs(
    query(
      enrollmentsCol,
      where("userId", "==", userId),
      orderBy("enrolledAt", "desc")
    )
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as TrainingEnrollment
  );
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  progress: number,
  completedModules: string[]
): Promise<void> {
  const ref = doc(db, "training_enrollments", enrollmentId);
  await updateDoc(ref, {
    progress,
    completedModules,
    status: progress >= 100 ? "completed" : "in-progress",
    ...(progress >= 100 ? { completedAt: serverTimestamp() } : {}),
  });
}
