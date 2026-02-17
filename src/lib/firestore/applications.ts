import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  timestamp: unknown;
  note?: string;
}

export interface Application {
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  orgName: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  reviewerNote?: string;
  appliedAt: unknown;
  updatedAt?: unknown;
}

const col = collection(db, "applications");

export async function getApplications(userId: string): Promise<Application[]> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), orderBy("appliedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
}

export async function getApplicationById(
  appId: string
): Promise<Application | null> {
  const snap = await getDoc(doc(db, "applications", appId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Application;
}

export async function getApplicationsByPost(
  postId: string
): Promise<Application[]> {
  const snap = await getDocs(
    query(col, where("postId", "==", postId), orderBy("appliedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
}

export async function hasApplied(
  userId: string,
  postId: string
): Promise<boolean> {
  const docId = `${userId}_${postId}`;
  const snap = await getDoc(doc(db, "applications", docId));
  return snap.exists();
}

export async function applyToPost(
  userId: string,
  postId: string,
  postTitle: string,
  orgName: string
): Promise<void> {
  const docId = `${userId}_${postId}`;
  const now = Timestamp.now();
  await setDoc(doc(db, "applications", docId), {
    userId,
    postId,
    postTitle,
    orgName,
    status: "submitted" as ApplicationStatus,
    statusHistory: [
      { status: "submitted" as ApplicationStatus, timestamp: now },
    ],
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateApplicationStatus(
  appId: string,
  status: ApplicationStatus,
  note?: string
): Promise<void> {
  const appDoc = await getDoc(doc(db, "applications", appId));
  if (!appDoc.exists()) throw new Error("Application not found");

  const data = appDoc.data();
  const history: StatusHistoryEntry[] = data.statusHistory || [];
  const entry: StatusHistoryEntry = {
    status,
    timestamp: Timestamp.now(),
  };
  if (note) entry.note = note;
  history.push(entry);

  await updateDoc(doc(db, "applications", appId), {
    status,
    statusHistory: history,
    updatedAt: serverTimestamp(),
  });
}

export async function withdrawApplication(appId: string): Promise<void> {
  await updateApplicationStatus(appId, "withdrawn", "Withdrawn by applicant");
}
