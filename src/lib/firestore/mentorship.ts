import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  expertise: string[];
  bio: string;
  yearsExperience: number;
  availability: "available" | "limited" | "unavailable";
  location: string;
  maxMentees: number;
  currentMentees: number;
  createdAt: Timestamp | unknown;
}

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  goals: string[];
  createdAt: Timestamp | unknown;
  respondedAt: Timestamp | unknown | null;
}

export async function getMentors(filters?: {
  expertise?: string;
  availability?: "available" | "limited" | "unavailable";
}): Promise<MentorProfile[]> {
  let q;
  if (filters?.availability) {
    q = query(
      collection(db, "mentor_profiles"),
      where("availability", "==", filters.availability),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(collection(db, "mentor_profiles"), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  let mentors = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MentorProfile);
  if (filters?.expertise) {
    const exp = filters.expertise.toLowerCase();
    mentors = mentors.filter((m) =>
      m.expertise.some((e) => e.toLowerCase().includes(exp))
    );
  }
  return mentors;
}

export async function getMentorProfile(
  userId: string
): Promise<MentorProfile | null> {
  const snap = await getDoc(doc(db, "mentor_profiles", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as MentorProfile;
}

export async function createMentorProfile(
  userId: string,
  data: Omit<MentorProfile, "id" | "createdAt" | "currentMentees">
): Promise<void> {
  await setDoc(doc(db, "mentor_profiles", userId), {
    ...data,
    userId,
    currentMentees: 0,
    createdAt: serverTimestamp(),
  });
}

export async function requestMentorship(data: {
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  message: string;
  goals: string[];
}): Promise<string> {
  const ref = await addDoc(collection(db, "mentorship_requests"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    respondedAt: null,
  });
  return ref.id;
}

export async function getMentorRequests(
  mentorId: string
): Promise<MentorshipRequest[]> {
  const q = query(
    collection(db, "mentorship_requests"),
    where("mentorId", "==", mentorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MentorshipRequest);
}

export async function getMyMentorRequests(
  menteeId: string
): Promise<MentorshipRequest[]> {
  const q = query(
    collection(db, "mentorship_requests"),
    where("menteeId", "==", menteeId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MentorshipRequest);
}

export async function updateRequestStatus(
  requestId: string,
  status: "accepted" | "declined"
): Promise<void> {
  await updateDoc(doc(db, "mentorship_requests", requestId), {
    status,
    respondedAt: serverTimestamp(),
  });
}

/** Accept a mentorship request: update status, create conversation, send welcome message, notify mentee */
export async function acceptMentorshipRequest(
  requestId: string,
  mentorId: string,
  mentorName: string,
  menteeId: string,
  menteeName: string
): Promise<string> {
  // Update request status
  await updateRequestStatus(requestId, "accepted");

  // Create conversation and send welcome message
  const { getOrCreateConversation, sendMessage } = await import("./messages");
  const conversationId = await getOrCreateConversation(mentorId, menteeId);
  await sendMessage(
    conversationId,
    mentorId,
    `Hi ${menteeName}! I've accepted your mentorship request. Looking forward to working together!`,
    menteeId
  );

  // Notify mentee
  const { addNotification } = await import("./notifications");
  await addNotification(menteeId, {
    type: "system",
    title: "Mentorship Request Accepted",
    body: `${mentorName} has accepted your mentorship request! You can now message them directly.`,
    link: "/messages",
  });

  return conversationId;
}
