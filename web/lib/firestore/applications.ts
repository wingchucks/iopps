import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy,
  increment, Timestamp, arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Application, ApplicationStatus } from "@/lib/types";

const col = () => collection(db!, "applications");

export async function submitApplication(data: Omit<Application, "id" | "createdAt" | "updatedAt" | "status" | "statusHistory">): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(col(), {
    ...data,
    status: "submitted",
    statusHistory: [{ status: "submitted", at: now }],
    createdAt: now,
    updatedAt: now,
  });
  // Increment application count on the job post
  await updateDoc(doc(db!, "posts", data.jobId), { applicationCount: increment(1) });
  return ref.id;
}

export async function getApplicationsByUser(uid: string): Promise<Application[]> {
  const snap = await getDocs(query(col(), where("applicantUid", "==", uid), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Application));
}

export async function getApplicationsByJob(jobId: string): Promise<Application[]> {
  const snap = await getDocs(query(col(), where("jobId", "==", jobId), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Application));
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<void> {
  const now = Timestamp.now();
  const entry: Record<string, unknown> = { status, at: now };
  if (note) entry.note = note;
  await updateDoc(doc(db!, "applications", id), {
    status,
    statusHistory: arrayUnion(entry),
    updatedAt: now,
  });
}
