import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { ScheduledInterview, ScheduledInterviewStatus } from "@/lib/types";

const COLLECTION = "scheduledInterviews";

// Get all interviews for an employer
export async function getEmployerInterviews(employerId: string): Promise<ScheduledInterview[]> {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTION),
    where("employerId", "==", employerId),
    orderBy("scheduledAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledInterview[];
}

// Get interviews for a specific application
export async function getApplicationInterviews(applicationId: string): Promise<ScheduledInterview[]> {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTION),
    where("applicationId", "==", applicationId),
    orderBy("scheduledAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledInterview[];
}

// Get interviews for a candidate (member)
export async function getCandidateInterviews(candidateId: string): Promise<ScheduledInterview[]> {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTION),
    where("candidateId", "==", candidateId),
    orderBy("scheduledAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledInterview[];
}

// Get a single interview
export async function getInterview(interviewId: string): Promise<ScheduledInterview | null> {
  if (!db) return null;

  const docRef = doc(db, COLLECTION, interviewId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as ScheduledInterview;
}

// Create a new interview
export async function createInterview(
  interview: Omit<ScheduledInterview, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  if (!db) throw new Error("Database not initialized");

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...interview,
    status: interview.status || "scheduled",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

// Update an interview
export async function updateInterview(
  interviewId: string,
  updates: Partial<Omit<ScheduledInterview, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const docRef = doc(db, COLLECTION, interviewId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Update interview status
export async function updateInterviewStatus(
  interviewId: string,
  status: ScheduledInterviewStatus,
  additionalData?: { cancelReason?: string }
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const docRef = doc(db, COLLECTION, interviewId);
  const updates: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now(),
  };

  if (status === "cancelled" && additionalData?.cancelReason) {
    updates.cancelledAt = Timestamp.now();
    updates.cancelReason = additionalData.cancelReason;
  }

  await updateDoc(docRef, updates);
}

// Delete an interview
export async function deleteInterview(interviewId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const docRef = doc(db, COLLECTION, interviewId);
  await deleteDoc(docRef);
}

// Get upcoming interviews for an employer (next 7 days)
export async function getUpcomingInterviews(employerId: string): Promise<ScheduledInterview[]> {
  if (!db) return [];

  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const q = query(
    collection(db, COLLECTION),
    where("employerId", "==", employerId),
    where("status", "==", "scheduled"),
    where("scheduledAt", ">=", Timestamp.fromDate(now)),
    where("scheduledAt", "<=", Timestamp.fromDate(weekFromNow)),
    orderBy("scheduledAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledInterview[];
}

// Generate ICS calendar file content
export function generateICSContent(interview: ScheduledInterview): string {
  const startDate = interview.scheduledAt instanceof Date
    ? interview.scheduledAt
    : new Date(interview.scheduledAt as string);

  const endDate = new Date(startDate.getTime() + interview.duration * 60 * 1000);

  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const location = interview.type === "virtual"
    ? interview.meetingUrl || "Virtual Meeting"
    : interview.type === "phone"
    ? `Phone: ${interview.phoneNumber || "TBD"}`
    : interview.location || "TBD";

  const description = [
    `Interview for: ${interview.jobTitle}`,
    interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : "",
    interview.notes ? `Notes: ${interview.notes}` : "",
    interview.meetingUrl ? `Meeting URL: ${interview.meetingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IOPPS//Interview Scheduler//EN
BEGIN:VEVENT
UID:${interview.id}@iopps.ca
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Interview - ${interview.jobTitle}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}
